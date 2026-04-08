import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:info@voxi.kz',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// In-memory subscription store (will reset on restart, but fine for MVP)
const subscriptions = new Map<string, any>();

export function saveSubscription(userId: string, subscription: any) {
  subscriptions.set(userId, subscription);
}

export function getSubscription(userId: string) {
  return subscriptions.get(userId);
}

export function getAllSubscriptions() {
  return Array.from(subscriptions.values());
}

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  const sub = subscriptions.get(userId);
  if (!sub) return;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err: any) {
    if (err.statusCode === 410) subscriptions.delete(userId); // expired
    console.error('Push send error:', err.message);
  }
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string; tag?: string }) {
  for (const [userId, sub] of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (err: any) {
      if (err.statusCode === 410) subscriptions.delete(userId);
    }
  }
}
