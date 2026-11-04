"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { setNotificationPref, type PushKind } from "@/lib/push";

const PUSH_KINDS: PushKind[] = ["restock", "checkout", "members"];

// Read at runtime so the key comes from Cloud Run's env, not whatever was present at build time.
export async function getVapidPublicKey(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
    [session.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, [
    endpoint,
    session.user.id,
  ]);
}

export async function updateNotificationPrefAction(kind: PushKind, enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");
  // Server actions are callable with arbitrary input, and `kind` picks a SQL column.
  if (!PUSH_KINDS.includes(kind)) throw new Error("Unknown notification type.");

  await setNotificationPref(session.user.id, kind, Boolean(enabled));
}

export async function setKitchenMutedAction(kitchenId: string, muted: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const { rowCount } = await pool.query(
    `UPDATE kitchen_members SET notifications_muted = $3, updated_at = now()
      WHERE kitchen_id = $1 AND user_id = $2`,
    [kitchenId, session.user.id, Boolean(muted)]
  );
  if (!rowCount) throw new Error("You are not a member of this kitchen.");
  revalidatePath("/dashboard");
}
