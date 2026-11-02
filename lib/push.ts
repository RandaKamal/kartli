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

export type PushKind = "restock" | "checkout" | "members";

export interface NotificationPrefs {
  restock: boolean;
  checkout: boolean;
  members: boolean;
}

// Whitelisted column names: never interpolate user input into these queries.
const PREF_COLUMN: Record<PushKind, string> = {
  restock: "notify_restock",
  checkout: "notify_checkout",
  members: "notify_members",
};

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { rows } = await pool.query<{
    notify_restock: boolean;
    notify_checkout: boolean;
    notify_members: boolean;
  }>(`SELECT notify_restock, notify_checkout, notify_members FROM users WHERE id = $1`, [userId]);
  const row = rows[0];
  return {
    restock: row?.notify_restock ?? true,
    checkout: row?.notify_checkout ?? true,
    members: row?.notify_members ?? false,
  };
}

export async function setNotificationPref(userId: string, kind: PushKind, enabled: boolean) {
  await pool.query(`UPDATE users SET ${PREF_COLUMN[kind]} = $2, updated_at = now() WHERE id = $1`, [
    userId,
    enabled,
  ]);
}

/**
 * Notifies the members of a kitchen who have this kind of alert turned on and
 * haven't muted the kitchen. Narrow the audience with `adminsOnly`, `userIds`,
 * and `excludeUserId` (usually whoever triggered the event).
 */
export async function notifyKitchen(
  kitchenId: string,
  kind: PushKind,
  payload: { title: string; body: string; url?: string },
  opts: { excludeUserId?: string; adminsOnly?: boolean; userIds?: string[] } = {}
): Promise<void> {
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT km.user_id
       FROM kitchen_members km
       JOIN users u ON u.id = km.user_id
      WHERE km.kitchen_id = $1
        AND km.joined_at IS NOT NULL
        AND km.notifications_muted = false
        AND u.${PREF_COLUMN[kind]} = true
        AND ($2::uuid IS NULL OR km.user_id <> $2::uuid)
        AND ($3::boolean = false OR km.role = 'ADMIN')
        AND ($4::uuid[] IS NULL OR km.user_id = ANY($4::uuid[]))`,
    [kitchenId, opts.excludeUserId ?? null, opts.adminsOnly ?? false, opts.userIds ?? null]
  );
  await sendPushToUsers(
    rows.map((r) => r.user_id),
    payload
  );
}
