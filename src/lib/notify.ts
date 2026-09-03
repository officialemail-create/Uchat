import { useSettingsStore } from '@/store/settingsStore';

export function requestNotificationPermission(): void {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showNotification(senderName: string, message: string, url = `${import.meta.env.BASE_URL}`): void {
  const { desktopNotifications, notificationPreviews } = useSettingsStore.getState();
  if (!desktopNotifications) return;
  if (document.hasFocus()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const body = notificationPreviews
    ? message.length > 100 ? message.slice(0, 100) + "…" : message
    : "New message";

  const options = { body, icon: `${import.meta.env.BASE_URL}favicon.ico`, tag: "uchat-chat", data: { url } };
  void navigator.serviceWorker?.ready.then((registration) => {
    void registration.showNotification(senderName, options);
  }).catch(() => {
    try { new Notification(senderName, options); } catch { /* ignore */ }
  });
}

export function playNotificationSound(): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* AudioContext unavailable */
  }
}
