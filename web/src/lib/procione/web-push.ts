import webpush from "web-push";
import { getProcioneEnv } from "@/lib/procione/env";

let configured = false;

function ensureWebPush() {
  if (configured) return;
  const { vapidPublicKey, vapidPrivateKey, vapidSubject } = getProcioneEnv();
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("Web Push non configurato (VAPID keys).");
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  ensureWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
    },
    JSON.stringify(payload)
  );
}
