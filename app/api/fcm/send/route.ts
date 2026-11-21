import { NextRequest, NextResponse } from 'next/server';
import firebaseConfig from '@/firebase-applet-config.json';
import {
  dispatchFcmPushNotifications,
  validateFcmSendPayload,
} from '@/lib/fcmServer';

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  'p55cia36bpmi@gmail.com',
]);

async function verifyAdminCaller(
  req: NextRequest,
  senderEmailRaw: unknown
): Promise<{ authorized: boolean; status: number; error?: string }> {
  const authHeader = req.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  let verifiedEmail = '';
  let verifiedUid = '';
  let bearerIdToken = '';

  if (bearerMatch) {
    bearerIdToken = bearerMatch[1].trim();
    try {
      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: bearerIdToken }),
        }
      );

      if (!lookupRes.ok) {
        return {
          authorized: false,
          status: 401,
          error: 'Token de autenticação inválido ou expirado.',
        };
      }

      const lookupData = (await lookupRes.json()) as {
        users?: Array<{ localId?: string; email?: string }>;
      };
      const firstUser = lookupData.users?.[0];
      if (!firstUser?.localId) {
        return {
          authorized: false,
          status: 401,
          error: 'Usuário autenticado não encontrado.',
        };
      }
      verifiedUid = firstUser.localId;
      verifiedEmail = (firstUser.email || '').trim().toLowerCase();
    } catch {
      return {
        authorized: false,
        status: 401,
        error: 'Falha ao validar sessão do administrador.',
      };
    }
  }

  const candidateEmail =
    verifiedEmail ||
    (typeof senderEmailRaw === 'string' ? senderEmailRaw.trim().toLowerCase() : '') ||
    (req.headers.get('x-admin-email') || '').trim().toLowerCase();

  if (!candidateEmail && !verifiedUid) {
    return {
      authorized: false,
      status: 401,
      error: 'Autenticação de administrador obrigatória para disparo push.',
    };
  }

  if (verifiedEmail && BOOTSTRAP_ADMIN_EMAILS.has(verifiedEmail)) {
    return { authorized: true, status: 200 };
  }

  // Verify admin role against Firestore users collection
  try {
    const dbBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerIdToken) {
      headers.Authorization = `Bearer ${bearerIdToken}`;
    }

    if (verifiedUid) {
      const docRes = await fetch(
        `${dbBase}/users/${encodeURIComponent(verifiedUid)}?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`,
        { headers }
      );
      if (docRes.ok) {
        const docJson = (await docRes.json()) as {
          fields?: { role?: { stringValue?: string } };
        };
        if (docJson.fields?.role?.stringValue === 'admin') {
          return { authorized: true, status: 200 };
        }
      }
    }

    if (candidateEmail) {
      const queryRes = await fetch(
        `${dbBase}:runQuery?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'users' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'email' },
                  op: 'EQUAL',
                  value: { stringValue: candidateEmail },
                },
              },
              limit: 5,
            },
          }),
        }
      );

      if (queryRes.ok) {
        const rows = (await queryRes.json()) as Array<{
          document?: { fields?: { role?: { stringValue?: string } } };
        }>;
        const isAdmin = rows.some(
          (row) => row.document?.fields?.role?.stringValue === 'admin'
        );
        if (isAdmin) {
          return { authorized: true, status: 200 };
        }
      }
    }
  } catch {
    return {
      authorized: false,
      status: 403,
      error: 'Não foi possível confirmar permissões de administrador.',
    };
  }

  return {
    authorized: false,
    status: 403,
    error: 'Apenas administradores podem enviar notificações push.',
  };
}

export async function POST(req: NextRequest) {
  // Same-origin enforcement when Origin header is present
  const origin = req.headers.get('origin');
  const expectedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (origin && expectedHost) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== expectedHost) {
        return NextResponse.json(
          { ok: false, error: 'Origem da requisição não autorizada.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Cabeçalho Origin inválido.' },
        { status: 403 }
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON inválido no corpo da requisição.' },
      { status: 400 }
    );
  }

  const senderEmail =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).senderEmail
      : undefined;

  const authCheck = await verifyAdminCaller(req, senderEmail);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { ok: false, error: authCheck.error || 'Não autorizado.' },
      { status: authCheck.status }
    );
  }

  const validation = validateFcmSendPayload(body);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }

  try {
    const result = await dispatchFcmPushNotifications({
      payload: validation.payload,
      serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      fallbackProjectId: firebaseConfig.projectId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erro ao processar envio de notificação push FCM.';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
