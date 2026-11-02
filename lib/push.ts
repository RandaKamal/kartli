import webpush from "web-push";
import { pool } from "@/lib/db";
import { en } from "@/lib/i18n/dictionaries/en";
import { de } from "@/lib/i18n/dictionaries/de";

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

type PushLocale = "en" | "de";
type PushStrings = typeof en.push;
type PushRenderer = (t: PushStrings, locale: PushLocale) => { title: string; body: string };

const PUSH_STRINGS: Record<PushLocale, PushStrings> = { en: en.push, de: de.push };

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

/** "€23.40" for English recipients, "23,40 €" for German ones. */
function formatAmount(amount: number, currency: string, locale: PushLocale): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  } catch {
    // Unknown currency code: fall back to a plain number rather than dropping the push.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** All push wording lives here and in the `push` dictionary section. */
export const pushMessages = {
  outOfStock: (item: string): PushRenderer => (t) => ({
    title: t.outOfStockTitle,
    body: fill(t.outOfStockBody, { item }),
  }),
  refundPending: (
    name: string,
    amount: number,
    currency: string,
    store?: string | null
  ): PushRenderer => (t, locale) => ({
    title: t.refundPendingTitle,
    body: fill(store ? t.refundPendingBody : t.refundPendingBodyNoStore, {
      name,
      amount: formatAmount(amount, currency, locale),
      store: store ?? "",
    }),
  }),
  refundComplete: (amount: number, currency: string): PushRenderer => (t, locale) => ({
    title: t.refundCompleteTitle,
    body: fill(t.refundCompleteBody, { amount: formatAmount(amount, currency, locale) }),
  }),
  newMember: (name: string): PushRenderer => (t) => ({
    title: t.newMemberTitle,
    body: fill(t.newMemberBody, { name }),
  }),
};

/**
 * Notifies the members of a kitchen who have this kind of alert turned on and
 * haven't muted the kitchen, each in their own language. Narrow the audience
 * with `adminsOnly`, `userIds`, and `excludeUserId` (usually whoever triggered the event).
 */
export async function notifyKitchen(
  kitchenId: string,
  kind: PushKind,
  message: { render: PushRenderer; url?: string },
  opts: { excludeUserId?: string; adminsOnly?: boolean; userIds?: string[] } = {}
): Promise<void> {
  const { rows } = await pool.query<{ user_id: string; language: string | null }>(
    `SELECT km.user_id, u.language
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

  // users.language defaults to 'de', so anything that isn't 'en' gets German.
  const byLocale: Record<PushLocale, string[]> = { en: [], de: [] };
  for (const row of rows) byLocale[row.language === "en" ? "en" : "de"].push(row.user_id);

  await Promise.all(
    (Object.keys(byLocale) as PushLocale[])
      .filter((locale) => byLocale[locale].length > 0)
      .map((locale) =>
        sendPushToUsers(byLocale[locale], {
          ...message.render(PUSH_STRINGS[locale], locale),
          url: message.url,
        })
      )
  );
}
