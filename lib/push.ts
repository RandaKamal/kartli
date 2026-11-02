import webpush from "web-push";
import { pool } from "@/lib/db";

let vapidConfigured = false;

/**
 * Configures web-push on first use instead of at import time, so a build or a
 * container without VAPID keys still works — push is just skipped.
 */
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys missing — skipping push notification.");
    return false;
  }
  webpush.setVapidDetails("mailto:contact@kartli.app", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Sends a push notification to every device a user has subscribed on.
 * Automatically cleans up subscriptions the browser reports as dead.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureVapid()) return;

  const { rows } = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        } else {
          console.error("Push send error:", error);
        }
      }
    })
  );
}

/** Sends the same notification to several users at once (e.g. all other kitchen members). */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
