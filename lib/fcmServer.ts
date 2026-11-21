import crypto from 'node:crypto';

export type PushNotificationCategory = 'trip_request' | 'maintenance';

export interface FcmSendRequestPayload {
  driverId: string;
  category: PushNotificationCategory;
  title: string;
  body: string;
  tokens: string[];
  priority?: 'normal' | 'urgent';
  data?: Record<string, string>;
}

export interface FirebaseServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface FcmDispatchResult {
  ok: boolean;
  fcmConfigured: boolean;
  sentCount: number;
  failedCount: number;
  fallbackCount: number;
  invalidTokens: string[];
  message: string;
}

export function parseServiceAccountFromEnv(
  rawJson: string | undefined,
  fallbackProjectId?: string
): FirebaseServiceAccountCredentials | null {
  if (!rawJson || !rawJson.trim()) return null;

  try {
    const parsed = JSON.parse(rawJson) as {
      project_id?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };

    const clientEmail =
      typeof parsed.client_email === 'string' ? parsed.client_email.trim() : '';
    const privateKeyRaw =
      typeof parsed.private_key === 'string' ? parsed.private_key : '';
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n').trim();
    const projectId =
      typeof parsed.project_id === 'string' && parsed.project_id.trim()
        ? parsed.project_id.trim()
        : fallbackProjectId || '';

    if (!clientEmail || !privateKey || !projectId) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

export function validateFcmSendPayload(
  rawBody: unknown
): { valid: true; payload: FcmSendRequestPayload } | { valid: false; error: string } {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { valid: false, error: 'Corpo da requisição inválido.' };
  }

  const obj = rawBody as Record<string, unknown>;
  const driverId = typeof obj.driverId === 'string' ? obj.driverId.trim() : '';
  const category = obj.category;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const body = typeof obj.body === 'string' ? obj.body.trim() : '';
  const priority = obj.priority === 'urgent' ? 'urgent' : 'normal';

  if (!driverId || driverId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(driverId)) {
    return { valid: false, error: 'Identificador de motorista inválido.' };
  }

  if (category !== 'trip_request' && category !== 'maintenance') {
    return { valid: false, error: 'Categoria de notificação inválida.' };
  }

  if (!title || title.length > 140) {
    return { valid: false, error: 'Título deve ter entre 1 e 140 caracteres.' };
  }

  if (!body || body.length > 500) {
    return { valid: false, error: 'Mensagem deve ter entre 1 e 500 caracteres.' };
  }

  if (!Array.isArray(obj.tokens) || obj.tokens.length > 20) {
    return { valid: false, error: 'Lista de tokens deve conter no máximo 20 dispositivos.' };
  }

  const cleanTokens: string[] = [];
  for (const item of obj.tokens) {
    if (typeof item !== 'string') {
      return { valid: false, error: 'Token de dispositivo inválido.' };
    }
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 512) {
      return { valid: false, error: 'Token de dispositivo fora do limite permitido.' };
    }
    if (!cleanTokens.includes(trimmed)) {
      cleanTokens.push(trimmed);
    }
  }

  const sanitizedData: Record<string, string> = {};
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    for (const [k, v] of Object.entries(obj.data as Record<string, unknown>)) {
      if (!k || k.startsWith('$') || k.length > 64) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        sanitizedData[k] = String(v).slice(0, 500);
      }
    }
  }

  return {
    valid: true,
    payload: {
      driverId,
      category,
      title,
      body,
      tokens: cleanTokens,
      priority,
      data: sanitizedData,
    },
  };
}

export function buildFcmV1Message(params: {
  token: string;
  title: string;
  body: string;
  category: PushNotificationCategory;
  priority?: 'normal' | 'urgent';
  data?: Record<string, string>;
}) {
  const { token, title, body, category, priority = 'normal', data = {} } = params;

  const messageData: Record<string, string> = {
    ...data,
    category,
    priority,
    title,
    body,
    url: '/',
  };

  return {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data: messageData,
      webpush: {
        headers: {
          Urgency: priority === 'urgent' || category === 'maintenance' ? 'high' : 'normal',
        },
        notification: {
          title,
          body,
          tag: `truckgestao-${category}`,
          renotify: true,
          requireInteraction: priority === 'urgent' || category === 'maintenance',
        },
        fcm_options: {
          link: '/',
        },
      },
    },
  };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createGoogleOAuthJwt(params: {
  clientEmail: string;
  privateKey: string;
  scope?: string;
  nowSeconds?: number;
}): string {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: params.clientEmail,
    scope: params.scope || 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claimSet)
  )}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(params.privateKey);

  return `${unsignedJwt}.${base64UrlEncode(signature)}`;
}

async function fetchGoogleFcmAccessToken(
  creds: FirebaseServiceAccountCredentials
): Promise<string> {
  const assertion = createGoogleOAuthJwt({
    clientEmail: creds.clientEmail,
    privateKey: creds.privateKey,
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Falha ao obter token OAuth2 do FCM (${resp.status}): ${errText.slice(0, 180)}`);
  }

  const json = (await resp.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Resposta OAuth2 do Google sem access_token.');
  }
  return json.access_token;
}

export async function dispatchFcmPushNotifications(params: {
  payload: FcmSendRequestPayload;
  serviceAccountJson: string | undefined;
  fallbackProjectId: string;
}): Promise<FcmDispatchResult> {
  const { payload, serviceAccountJson, fallbackProjectId } = params;

  const realFcmTokens = payload.tokens.filter((t) => !t.startsWith('webpush-'));
  const fallbackTokens = payload.tokens.filter((t) => t.startsWith('webpush-'));

  const creds = parseServiceAccountFromEnv(serviceAccountJson, fallbackProjectId);
  if (!creds) {
    return {
      ok: true,
      fcmConfigured: false,
      sentCount: 0,
      failedCount: 0,
      fallbackCount: payload.tokens.length,
      invalidTokens: [],
      message:
        'Alerta salvo no Firestore e enviado ao portal em tempo real. Configure FIREBASE_SERVICE_ACCOUNT_JSON e NEXT_PUBLIC_FIREBASE_VAPID_KEY para disparo push FCM em segundo plano.',
    };
  }

  if (realFcmTokens.length === 0) {
    return {
      ok: true,
      fcmConfigured: true,
      sentCount: 0,
      failedCount: 0,
      fallbackCount: fallbackTokens.length,
      invalidTokens: [],
      message:
        fallbackTokens.length > 0
          ? 'Dispositivo registrado em modo Web Push local; alerta sincronizado em tempo real.'
          : 'Nenhum token FCM cadastrado para este motorista; alerta salvo no portal.',
    };
  }

  const accessToken = await fetchGoogleFcmAccessToken(creds);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
    creds.projectId
  )}/messages:send`;

  let sentCount = 0;
  let failedCount = 0;
  const invalidTokens: string[] = [];

  for (const token of realFcmTokens) {
    const body = buildFcmV1Message({
      token,
      title: payload.title,
      body: payload.body,
      category: payload.category,
      priority: payload.priority,
      data: payload.data,
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      sentCount += 1;
    } else {
      failedCount += 1;
      const errBody = await res.text().catch(() => '');
      if (errBody.includes('UNREGISTERED') || errBody.includes('NOT_FOUND')) {
        invalidTokens.push(token);
      }
    }
  }

  return {
    ok: true,
    fcmConfigured: true,
    sentCount,
    failedCount,
    fallbackCount: fallbackTokens.length,
    invalidTokens,
    message: `Push FCM enviado para ${sentCount} dispositivo(s)${
      failedCount > 0 ? ` (${failedCount} falha(s))` : ''
    }.`,
  };
}
