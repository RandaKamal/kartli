import { pool } from "@/lib/db";
import type { UserPasskey } from "@/types";

export interface StoredPasskeyRecord {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  device_name: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

export async function listUserPasskeys(userId: string): Promise<UserPasskey[]> {
  const { rows } = await pool.query<UserPasskey>(
    `SELECT id, user_id, credential_id, device_name, transports, created_at, last_used_at
     FROM public.user_passkeys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getPasskeyByCredentialId(
  credentialId: string
): Promise<StoredPasskeyRecord | null> {
  const { rows } = await pool.query<StoredPasskeyRecord>(
    `SELECT id, user_id, credential_id, public_key, counter, transports, device_name, created_at, last_used_at
     FROM public.user_passkeys
     WHERE credential_id = $1
     LIMIT 1`,
    [credentialId]
  );
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    counter: Number(rows[0].counter) || 0,
  };
}

export async function saveUserPasskey(input: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[] | null;
  deviceName?: string | null;
}): Promise<UserPasskey> {
  const { rows } = await pool.query<UserPasskey>(
    `INSERT INTO public.user_passkeys (user_id, credential_id, public_key, counter, transports, device_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (credential_id) DO UPDATE
       SET public_key = EXCLUDED.public_key,
           counter = EXCLUDED.counter,
           transports = EXCLUDED.transports,
           device_name = COALESCE(EXCLUDED.device_name, public.user_passkeys.device_name)
     RETURNING id, user_id, credential_id, device_name, transports, created_at, last_used_at`,
    [
      input.userId,
      input.credentialId,
      input.publicKey,
      input.counter,
      input.transports && input.transports.length > 0 ? input.transports : null,
      input.deviceName?.trim() || null,
    ]
  );
  return rows[0];
}

export async function updatePasskeyUsage(
  passkeyId: string,
  newCounter: number
): Promise<void> {
  await pool.query(
    `UPDATE public.user_passkeys
     SET counter = $1, last_used_at = NOW()
     WHERE id = $2`,
    [newCounter, passkeyId]
  );
}

export async function deleteUserPasskey(
  passkeyId: string,
  userId: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM public.user_passkeys WHERE id = $1 AND user_id = $2`,
    [passkeyId, userId]
  );
  return (rowCount ?? 0) > 0;
}
