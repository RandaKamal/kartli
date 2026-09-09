"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";

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
