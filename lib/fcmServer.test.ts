import crypto from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  buildFcmV1Message,
  createGoogleOAuthJwt,
  dispatchFcmPushNotifications,
  parseServiceAccountFromEnv,
  validateFcmSendPayload,
} from './fcmServer';

describe('validateFcmSendPayload', () => {
  test('accepts valid trip_request payload and deduplicates tokens', () => {
    const res = validateFcmSendPayload({
      driverId: 'drv-01',
      category: 'trip_request',
      title: 'Nova solicitação de viagem',
      body: 'Campinas → Santos · Carga fracionada',
      tokens: ['tok-abc', 'tok-abc', 'webpush-drv-01-123'],
      priority: 'urgent',
      data: {
        tripId: 'trip-1',
        $evil: 'ignored',
      },
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.payload.tokens).toEqual(['tok-abc', 'webpush-drv-01-123']);
      expect(res.payload.priority).toBe('urgent');
      expect(res.payload.data).toEqual({ tripId: 'trip-1' });
    }
  });

  test('rejects invalid driverId, category, or oversized token list', () => {
    expect(
      validateFcmSendPayload({
        driverId: '../bad',
        category: 'trip_request',
        title: 'Oi',
        body: 'Teste',
        tokens: [],
      }).valid
    ).toBe(false);

    expect(
      validateFcmSendPayload({
        driverId: 'drv-01',
        category: 'other',
        title: 'Oi',
        body: 'Teste',
        tokens: [],
      }).valid
    ).toBe(false);

    expect(
      validateFcmSendPayload({
        driverId: 'drv-01',
        category: 'maintenance',
        title: 'Manutenção',
        body: 'Troca de óleo vencida',
        tokens: Array.from({ length: 21 }, (_, i) => `t-${i}`),
      }).valid
    ).toBe(false);
  });
});

describe('buildFcmV1Message', () => {
  test('formats FCM HTTP v1 notification and webpush high urgency for maintenance', () => {
    const msg = buildFcmV1Message({
      token: 'fcm-token-1',
      title: 'Manutenção Pendente',
      body: 'Veículo BRA2E19 atingiu limite de 20.000 km',
      category: 'maintenance',
      data: { vehiclePlate: 'BRA2E19' },
    });

    expect(msg.message.token).toBe('fcm-token-1');
    expect(msg.message.notification.title).toBe('Manutenção Pendente');
    expect(msg.message.webpush.headers.Urgency).toBe('high');
    expect(msg.message.webpush.notification.requireInteraction).toBe(true);
    expect(msg.message.data.category).toBe('maintenance');
    expect(msg.message.data.vehiclePlate).toBe('BRA2E19');
  });
});

describe('parseServiceAccountFromEnv and createGoogleOAuthJwt', () => {
  test('returns null on missing or malformed JSON', () => {
    expect(parseServiceAccountFromEnv(undefined, 'proj-1')).toBeNull();
    expect(parseServiceAccountFromEnv('{bad json', 'proj-1')).toBeNull();
  });

  test('signs a valid RS256 JWT assertion for Firebase Messaging scope', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const saJson = JSON.stringify({
      project_id: 'truck-proj',
      client_email: 'fcm@truck-proj.iam.gserviceaccount.com',
      private_key: privateKey,
    });
    const parsed = parseServiceAccountFromEnv(saJson, 'fallback');
    expect(parsed?.projectId).toBe('truck-proj');

    const jwt = createGoogleOAuthJwt({
      clientEmail: parsed!.clientEmail,
      privateKey: parsed!.privateKey,
      nowSeconds: 1700000000,
    });

    const parts = jwt.split('.');
    expect(parts.length).toBe(3);

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const sigBuffer = Buffer.from(
      parts[2].replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    expect(verifier.verify(publicKey, sigBuffer)).toBe(true);
  });
});

describe('dispatchFcmPushNotifications', () => {
  test('returns honest non-failing fallback status when service account env is absent', async () => {
    const result = await dispatchFcmPushNotifications({
      payload: {
        driverId: 'drv-01',
        category: 'trip_request',
        title: 'Nova Viagem',
        body: 'Campinas → Curitiba',
        tokens: ['webpush-drv-01-abc'],
      },
      serviceAccountJson: undefined,
      fallbackProjectId: 'gen-lang-client-0801387523',
    });

    expect(result.ok).toBe(true);
    expect(result.fcmConfigured).toBe(false);
    expect(result.sentCount).toBe(0);
    expect(result.fallbackCount).toBe(1);
  });
});
