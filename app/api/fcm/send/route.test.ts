import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST } from './route';

function makeRequest(
  body: string | Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:3000/api/fcm/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      ...headers,
    },
    body: payload,
  });
}

describe('POST /api/fcm/send access control & validation', () => {
  test('rejects cross-origin requests with 403', async () => {
    const req = makeRequest(
      {
        driverId: 'drv-01',
        category: 'trip_request',
        title: 'Nova Viagem',
        body: 'Campinas -> Jundiaí',
        tokens: ['webpush-1'],
      },
      { origin: 'https://evil-attacker.example' }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('rejects malformed JSON body with 400', async () => {
    const req = makeRequest('{invalid-json');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects unauthenticated callers without bearer token or admin email with 401', async () => {
    const req = makeRequest({
      driverId: 'drv-01',
      category: 'trip_request',
      title: 'Nova Viagem',
      body: 'Teste sem credenciais',
      tokens: ['webpush-1'],
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects driver accounts attempting to send push alerts with 403', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            document: {
              fields: {
                role: { stringValue: 'driver' },
              },
            },
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )) as unknown as typeof fetch;

    try {
      const req = makeRequest({
        senderEmail: 'carlos.silveira@truckgestao.com',
        driverId: 'drv-01',
        category: 'trip_request',
        title: 'Nova Viagem',
        body: 'Tentativa de motorista',
        tokens: ['webpush-1'],
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('allows verified admin and validates payload fields (returns 400 on bad driverId)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            document: {
              fields: {
                role: { stringValue: 'admin' },
              },
            },
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )) as unknown as typeof fetch;

    try {
      const req = makeRequest({
        senderEmail: 'admin@truckgestao.com',
        driverId: 'bad driver id!',
        category: 'trip_request',
        title: 'Nova Viagem',
        body: 'Carga',
        tokens: ['webpush-1'],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('allows bootstrapped admin via verified Bearer token and returns 200 fallback status', async () => {
    const originalFetch = globalThis.fetch;
    const prevServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('identitytoolkit.googleapis.com')) {
        return new Response(
          JSON.stringify({
            users: [{ localId: 'uid-admin-1', email: 'p55cia36bpmi@gmail.com' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      const req = makeRequest(
        {
          driverId: 'drv-01',
          category: 'maintenance',
          title: 'Manutenção Pendente: BRA2E19',
          body: 'Revisão preventiva em 300 km',
          tokens: ['webpush-drv-01-abc'],
          priority: 'urgent',
        },
        { authorization: 'Bearer valid-firebase-token' }
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        ok: boolean;
        fcmConfigured: boolean;
        fallbackCount: number;
      };
      expect(data.ok).toBe(true);
      expect(data.fcmConfigured).toBe(false);
      expect(data.fallbackCount).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (prevServiceAccount !== undefined) {
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON = prevServiceAccount;
      }
    }
  });
});
