import { apiUrl } from './api-url';
import { getSessionToken } from './auth';

function base64ToBytes(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function pushRequest(path: string, options: RequestInit = {}) {
  const token = getSessionToken();
  const username = localStorage.getItem('uchat_username');
  return fetch(apiUrl(path), {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(username ? { 'x-username': username } : {}), ...(options.headers ?? {}) },
  });
}

export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const token = getSessionToken();
  const username = localStorage.getItem('uchat_username');
  const keyResponse = await pushRequest('/push/vapid-public-key');
  if (!keyResponse.ok) return false;
  const { publicKey } = await keyResponse.json() as { publicKey: string };
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
  const response = await pushRequest('/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(username ? { 'x-username': username } : {}) },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  return response.ok;
}

export async function disablePushNotifications() {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration(`${import.meta.env.BASE_URL}`);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return true;
  const response = await pushRequest('/push/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  if (response.ok) await subscription.unsubscribe();
  return response.ok;
}