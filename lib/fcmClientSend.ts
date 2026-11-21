'use client';

import { auth } from '@/lib/firebase';
import {
  disableDriverFcmToken,
  getDriverFcmTokens,
} from '@/services/firestoreService';
import type { FcmDispatchResult, PushNotificationCategory } from '@/lib/fcmServer';

export interface SendDriverPushParams {
  driverId: string;
  category: PushNotificationCategory;
  title: string;
  body: string;
  priority?: 'normal' | 'urgent';
  data?: Record<string, string>;
  senderEmail: string;
}

export async function sendDriverPushAlert(
  params: SendDriverPushParams
): Promise<FcmDispatchResult> {
  const registrations = await getDriverFcmTokens(params.driverId);
  const eligible = registrations.filter((reg) => {
    if (!reg.enabled) return false;
    return params.category === 'trip_request' ? reg.notifyTrips : reg.notifyMaintenance;
  });

  if (eligible.length === 0) {
    return {
      ok: true,
      fcmConfigured: false,
      sentCount: 0,
      failedCount: 0,
      fallbackCount: 0,
      invalidTokens: [],
      message:
        'Motorista sem notificações push ativas para esta categoria; alerta sincronizado no portal em tempo real.',
    };
  }

  const tokens = eligible.map((r) => r.token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      // Fallback to senderEmail verification on server
    }
  }

  const res = await fetch('/api/fcm/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      driverId: params.driverId,
      category: params.category,
      title: params.title.slice(0, 140),
      body: params.body.slice(0, 500),
      tokens,
      priority: params.priority || 'normal',
      data: params.data || {},
      senderEmail: params.senderEmail,
    }),
  });

  const payload = (await res.json()) as Partial<FcmDispatchResult> & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error || 'Falha ao enviar notificação push.');
  }

  // Disable unregistered/stale tokens automatically
  const invalidTokens = Array.isArray(payload.invalidTokens) ? payload.invalidTokens : [];
  if (invalidTokens.length > 0) {
    const staleRegs = eligible.filter((r) => invalidTokens.includes(r.token));
    await Promise.all(staleRegs.map((r) => disableDriverFcmToken(r.id)));
  }

  return {
    ok: Boolean(payload.ok),
    fcmConfigured: Boolean(payload.fcmConfigured),
    sentCount: Number(payload.sentCount) || 0,
    failedCount: Number(payload.failedCount) || 0,
    fallbackCount: Number(payload.fallbackCount) || 0,
    invalidTokens,
    message: payload.message || 'Notificação push processada.',
  };
}
