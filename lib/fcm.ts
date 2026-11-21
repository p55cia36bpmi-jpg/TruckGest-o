'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  MessagePayload,
} from 'firebase/messaging';
import firebaseConfig from '@/firebase-applet-config.json';

export interface FcmRegistrationOutcome {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  registrationMode: 'fcm' | 'web_push_fallback';
  token: string | null;
  reason?: string;
}

function getFirebaseClientApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getBrowserLabel(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  const browser = ua.includes('Edg/')
    ? 'Edge'
    : ua.includes('Chrome/')
    ? 'Chrome'
    : ua.includes('Firefox/')
    ? 'Firefox'
    : ua.includes('Safari/')
    ? 'Safari'
    : 'Navegador';
  const os = ua.includes('Android')
    ? 'Android'
    : ua.includes('iPhone') || ua.includes('iPad')
    ? 'iOS'
    : ua.includes('Windows')
    ? 'Windows'
    : ua.includes('Mac')
    ? 'macOS'
    : 'Linux';
  return `${browser} · ${os}`.slice(0, 120);
}

export function getOrCreateStableDeviceToken(driverId: string): string {
  const storageKey = `truckgestao_device_push_id_${driverId}`;
  if (typeof window === 'undefined') return `webpush-${driverId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing && existing.length > 8) return existing;

  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const generated = `webpush-${driverId}-${rand}`.slice(0, 128);
  localStorage.setItem(storageKey, generated);
  return generated;
}

export async function registerServiceWorkerForFcm(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    storageBucket: firebaseConfig.storageBucket || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });

  const swUrl = `/firebase-messaging-sw.js?${params.toString()}`;
  const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function requestDriverFcmRegistration(
  driverId: string
): Promise<FcmRegistrationOutcome> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      supported: false,
      permission: 'unsupported',
      registrationMode: 'web_push_fallback',
      token: null,
      reason: 'Navegador sem suporte à API de Notificações.',
    };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      registrationMode: 'web_push_fallback',
      token: null,
      reason:
        permission === 'denied'
          ? 'Permissão de notificações bloqueada no navegador.'
          : 'Permissão de notificações não concedida.',
    };
  }

  let swRegistration: ServiceWorkerRegistration | null = null;
  try {
    swRegistration = await registerServiceWorkerForFcm();
  } catch (err) {
    console.warn('Falha ao registrar service worker FCM:', err);
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const fcmSupported = await isSupported().catch(() => false);

  if (fcmSupported && vapidKey && swRegistration) {
    try {
      const messaging = getMessaging(getFirebaseClientApp());
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        return {
          supported: true,
          permission,
          registrationMode: 'fcm',
          token,
        };
      }
    } catch (err) {
      console.warn('Não foi possível obter token FCM; ativando modo Web Push local:', err);
    }
  }

  return {
    supported: true,
    permission,
    registrationMode: 'web_push_fallback',
    token: getOrCreateStableDeviceToken(driverId),
    reason: !vapidKey
      ? 'Chave VAPID (NEXT_PUBLIC_FIREBASE_VAPID_KEY) não configurada; notificações web locais ativas.'
      : undefined,
  };
}

export async function listenForegroundFcmMessages(
  onPayload: (payload: MessagePayload) => void
): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};
  const supported = await isSupported().catch(() => false);
  if (!supported) return () => {};

  try {
    const messaging = getMessaging(getFirebaseClientApp());
    return onMessage(messaging, onPayload);
  } catch {
    return () => {};
  }
}

export async function showNativePushNotification(params: {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(params.title, {
          body: params.body,
          tag: params.tag || 'truckgestao-push',
          requireInteraction: Boolean(params.requireInteraction),
        });
        return true;
      }
    }

    new Notification(params.title, {
      body: params.body,
      tag: params.tag || 'truckgestao-push',
    });
    return true;
  } catch {
    return false;
  }
}
