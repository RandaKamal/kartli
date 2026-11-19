#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import Module from "node:module";

// ---- In-memory mock PostgreSQL state ----
interface MockUser {
  id: string;
  username: string;
  password_hash: string;
  preferred_currency: string;
  has_completed_tour: boolean;
  session_version: number;
}

interface MockKitchen {
  id: string;
  name: string;
}

interface MockKitchenMember {
  id: string;
  kitchen_id: string;
  user_id: string;
  role: "ADMIN" | "MEMBER";
  joined_at: Date | null;
}

interface MockResetToken {
  id: string;
  user_id: string;
  kitchen_id: string;
  created_by_admin_id: string | null;
  token_hash: string;
  requires_second_kitchen_check: boolean;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const SINGLE_USER_ID = "22222222-2222-4222-8222-222222222222";
const MULTI_USER_ID = "33333333-3333-4333-8333-333333333333";
const KITCHEN_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KITCHEN_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let users: MockUser[] = [];
let kitchens: MockKitchen[] = [];
let members: MockKitchenMember[] = [];
let resetTokens: MockResetToken[] = [];
let tokenSeq = 0;

function resetDb() {
  tokenSeq = 0;
  resetTokens = [];
  users = [
    {
      id: ADMIN_ID,
      username: "admin_lisa",
      password_hash: "old-hash-admin",
      preferred_currency: "EUR",
      has_completed_tour: true,
      session_version: 1,
    },
    {
      id: SINGLE_USER_ID,
      username: "single_finn",
      password_hash: "old-hash-finn",
      preferred_currency: "EUR",
      has_completed_tour: true,
      session_version: 1,
    },
    {
      id: MULTI_USER_ID,
      username: "multi_maya",
      password_hash: "old-hash-maya",
      preferred_currency: "EUR",
      has_completed_tour: true,
      session_version: 1,
    },
  ];
  kitchens = [
    { id: KITCHEN_A_ID, name: "Kitchen Alpha" },
    { id: KITCHEN_B_ID, name: "WG Sonnenschein" },
  ];
  members = [
    {
      id: "m-1",
      kitchen_id: KITCHEN_A_ID,
      user_id: ADMIN_ID,
      role: "ADMIN",
      joined_at: new Date(),
    },
    {
      id: "m-2",
      kitchen_id: KITCHEN_A_ID,
      user_id: SINGLE_USER_ID,
      role: "MEMBER",
      joined_at: new Date(),
    },
    {
      id: "m-3",
      kitchen_id: KITCHEN_A_ID,
      user_id: MULTI_USER_ID,
      role: "MEMBER",
      joined_at: new Date(),
    },
    {
      id: "m-4",
      kitchen_id: KITCHEN_B_ID,
      user_id: MULTI_USER_ID,
      role: "ADMIN",
      joined_at: new Date(),
    },
  ];
}

async function mockQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount?: number }> {
  const q = sql.replace(/\s+/g, " ").trim();

  if (q === "BEGIN" || q === "COMMIT" || q === "ROLLBACK") {
    return { rows: [] };
  }

  // Check admin role
  if (q.includes("SELECT role FROM public.kitchen_members")) {
    const [kitchenId, userId] = params;
    const found = members.filter(
      (m) => m.kitchen_id === kitchenId && m.user_id === userId && m.joined_at !== null
    );
    return { rows: found.map((m) => ({ role: m.role })) };
  }

  // Check target active member
  if (q.includes("SELECT km.id FROM public.kitchen_members km JOIN public.users u")) {
    const [kitchenId, userId] = params;
    const found = members.filter((m) => {
      if (m.kitchen_id !== kitchenId || m.user_id !== userId || m.joined_at === null) {
        return false;
      }
      const u = users.find((usr) => usr.id === m.user_id);
      return Boolean(u && !u.username.startsWith("deleted_user_"));
    });
    return { rows: found.map((m) => ({ id: m.id })) };
  }

  // Count distinct kitchens
  if (q.includes("SELECT COUNT(DISTINCT kitchen_id)::int AS kitchen_count")) {
    const [userId] = params;
    const distinctKitchens = new Set(
      members
        .filter((m) => m.user_id === userId && m.joined_at !== null)
        .map((m) => m.kitchen_id)
    );
    return { rows: [{ kitchen_count: distinctKitchens.size }] };
  }

  // Invalidate prior unused reset tokens
  if (q.includes("UPDATE public.password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL")) {
    const [userId] = params;
    let count = 0;
    for (const t of resetTokens) {
      if (t.user_id === userId && t.used_at === null) {
        t.used_at = new Date();
        count++;
      }
    }
    return { rows: [], rowCount: count };
  }

  // Insert reset token
  if (q.includes("INSERT INTO public.password_reset_tokens")) {
    const [userId, kitchenId, adminId, tokenHash, reqSecond, expiresAt] = params;
    resetTokens.push({
      id: `tok-${++tokenSeq}`,
      user_id: userId,
      kitchen_id: kitchenId,
      created_by_admin_id: adminId,
      token_hash: tokenHash,
      requires_second_kitchen_check: reqSecond,
      expires_at: new Date(expiresAt),
      used_at: null,
      created_at: new Date(),
    });
    return { rows: [] };
  }

  // Validate reset token
  if (q.includes("SELECT u.username, t.requires_second_kitchen_check, t.expires_at FROM public.password_reset_tokens t")) {
    const [tokenHash] = params;
    const now = Date.now();
    const t = resetTokens.find(
      (row) => row.token_hash === tokenHash && row.used_at === null && row.expires_at.getTime() > now
    );
    if (!t) return { rows: [] };
    const u = users.find((usr) => usr.id === t.user_id);
    if (!u || u.username.startsWith("deleted_user_")) return { rows: [] };
    return {
      rows: [
        {
          username: u.username,
          requires_second_kitchen_check: t.requires_second_kitchen_check,
          expires_at: t.expires_at,
        },
      ],
    };
  }

  // Lock token for update
  if (q.includes("FROM public.password_reset_tokens t JOIN public.users u ON u.id = t.user_id WHERE t.token_hash = $1 FOR UPDATE")) {
    const [tokenHash] = params;
    const t = resetTokens.find((row) => row.token_hash === tokenHash);
    if (!t) return { rows: [] };
    const u = users.find((usr) => usr.id === t.user_id);
    if (!u) return { rows: [] };
    return {
      rows: [
        {
          id: t.id,
          user_id: t.user_id,
          kitchen_id: t.kitchen_id,
          requires_second_kitchen_check: t.requires_second_kitchen_check,
          expires_at: t.expires_at,
          used_at: t.used_at,
          username: u.username,
        },
      ],
    };
  }

  // Second kitchen verification
  if (q.includes("SELECT k.id FROM public.kitchen_members km JOIN public.kitchens k")) {
    const [userId, excludedKitchenId, candidateName] = params;
    const clean = String(candidateName).trim().toLowerCase();
    const matched = members.filter((m) => {
      if (m.user_id !== userId || m.joined_at === null || m.kitchen_id === excludedKitchenId) {
        return false;
      }
      const k = kitchens.find((kit) => kit.id === m.kitchen_id);
      return Boolean(k && k.name.trim().toLowerCase() === clean);
    });
    return { rows: matched.map((m) => ({ id: m.kitchen_id })) };
  }

  // Update user password & session_version
  if (q.includes("UPDATE public.users SET password_hash = $1, session_version = COALESCE(session_version, 1) + 1")) {
    const [newHash, userId] = params;
    const u = users.find((usr) => usr.id === userId);
    if (u) {
      u.password_hash = newHash;
      u.session_version += 1;
    }
    return { rows: [], rowCount: u ? 1 : 0 };
  }

  // Mark reset token used
  if (q.includes("UPDATE public.password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL")) {
    const [id] = params;
    const t = resetTokens.find((row) => row.id === id && row.used_at === null);
    if (t) t.used_at = new Date();
    return { rows: [], rowCount: t ? 1 : 0 };
  }

  // getUserSessionVersion
  if (q.includes("SELECT COALESCE(session_version, 1) AS session_version, username FROM users WHERE id = $1")) {
    const [userId] = params;
    const u = users.find((usr) => usr.id === userId);
    if (!u) return { rows: [] };
    return { rows: [{ session_version: u.session_version, username: u.username }] };
  }

  throw new Error(`Unhandled mock SQL: ${q}`);
}

const mockPool = {
  query: mockQuery,
  connect: async () => ({
    query: mockQuery,
    release: () => {},
  }),
};

// Intercept @/lib/db before importing app modules
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/db") {
    return { pool: mockPool };
  }
  return originalLoad.apply(this, arguments);
};

async function runTests() {
  const webauthn = await import("../lib/webauthn");
  const simpleWebAuthn = await import("@simplewebauthn/server");
  const passwordReset = await import("../lib/password-reset");
  const { authConfig } = await import("../auth.config");

  console.log("1. Testing WebAuthn RP config, signed challenges, and passkey login nonces...");
  const localHeaders = new Headers({ host: "localhost:3000" });
  const localRp = webauthn.getWebAuthnRpConfig(localHeaders);
  assert.equal(localRp.rpID, "localhost");
  assert.equal(localRp.origin, "http://localhost:3000");

  const vercelHeaders = new Headers({
    "x-forwarded-host": "kartli.vercel.app",
    "x-forwarded-proto": "https",
  });
  const vercelRp = webauthn.getWebAuthnRpConfig(vercelHeaders);
  assert.equal(vercelRp.rpID, "kartli.vercel.app");
  assert.equal(vercelRp.origin, "https://kartli.vercel.app");

  const regOptions = await simpleWebAuthn.generateRegistrationOptions({
    rpName: localRp.rpName,
    rpID: localRp.rpID,
    userID: SINGLE_USER_ID,
    userName: "single_finn",
  });
  assert.ok(regOptions.challenge.length > 10);

  const signedRegChallenge = webauthn.createSignedChallenge({
    challenge: regOptions.challenge,
    purpose: "register",
    userId: SINGLE_USER_ID,
  });
  const verifiedReg = webauthn.verifySignedChallenge(
    signedRegChallenge,
    "register",
    SINGLE_USER_ID
  );
  assert.equal(verifiedReg?.challenge, regOptions.challenge);
  // Wrong user or wrong purpose fails
  assert.equal(
    webauthn.verifySignedChallenge(signedRegChallenge, "register", MULTI_USER_ID),
    null
  );
  assert.equal(webauthn.verifySignedChallenge(signedRegChallenge, "login"), null);
  // Tampered signature fails
  assert.equal(
    webauthn.verifySignedChallenge(`${signedRegChallenge}tamper`, "register", SINGLE_USER_ID),
    null
  );

  // Expired challenge fails
  const expiredChallenge = webauthn.createSignedChallenge({
    challenge: "abc",
    purpose: "login",
    ttlMs: -1000,
  });
  assert.equal(webauthn.verifySignedChallenge(expiredChallenge, "login"), null);

  // Passkey login nonce is single-use
  const loginNonce = webauthn.createPasskeyLoginNonce(SINGLE_USER_ID);
  assert.deepEqual(webauthn.verifyPasskeyLoginNonce(loginNonce), {
    userId: SINGLE_USER_ID,
  });
  assert.equal(webauthn.verifyPasskeyLoginNonce(loginNonce), null);

  console.log("2. Testing Single-Kitchen Admin Password Reset Link...");
  resetDb();
  const singleLink = await passwordReset.createAdminPasswordResetToken({
    kitchenId: KITCHEN_A_ID,
    adminUserId: ADMIN_ID,
    targetUserId: SINGLE_USER_ID,
  });
  assert.equal(singleLink.requiresSecondKitchenCheck, false);
  assert.ok(singleLink.rawToken.length >= 32);
  // Raw token must never be stored in DB
  assert.equal(
    resetTokens.some((t) => t.token_hash === singleLink.rawToken),
    false
  );

  const singleValidation = await passwordReset.validatePasswordResetToken(
    singleLink.rawToken
  );
  assert.equal(singleValidation.valid, true);
  assert.equal(singleValidation.username, "single_finn");
  assert.equal(singleValidation.requiresSecondKitchenCheck, false);

  const singleRedeem = await passwordReset.redeemPasswordResetToken({
    rawToken: singleLink.rawToken,
    newPassword: "new-secure-password",
  });
  assert.deepEqual(singleRedeem, { success: true, username: "single_finn" });

  // Single-use enforcement
  const singleReuse = await passwordReset.redeemPasswordResetToken({
    rawToken: singleLink.rawToken,
    newPassword: "another-password",
  });
  assert.deepEqual(singleReuse, {
    success: false,
    errorCode: "INVALID_OR_EXPIRED",
  });

  console.log("3. Testing Multi-Kitchen Co-Verified Admin Password Reset Link...");
  resetDb();
  const multiLink = await passwordReset.createAdminPasswordResetToken({
    kitchenId: KITCHEN_A_ID,
    adminUserId: ADMIN_ID,
    targetUserId: MULTI_USER_ID,
  });
  assert.equal(multiLink.requiresSecondKitchenCheck, true);

  // Missing second kitchen name -> rejected
  const missingSecond = await passwordReset.redeemPasswordResetToken({
    rawToken: multiLink.rawToken,
    newPassword: "new-password-123",
  });
  assert.deepEqual(missingSecond, {
    success: false,
    errorCode: "SECOND_KITCHEN_REQUIRED",
  });

  // Using the issuing kitchen's own name -> rejected
  const sameKitchenAttempt = await passwordReset.redeemPasswordResetToken({
    rawToken: multiLink.rawToken,
    newPassword: "new-password-123",
    secondKitchenName: "Kitchen Alpha",
  });
  assert.deepEqual(sameKitchenAttempt, {
    success: false,
    errorCode: "SECOND_KITCHEN_MISMATCH",
  });

  // Wrong kitchen name -> rejected
  const wrongKitchenAttempt = await passwordReset.redeemPasswordResetToken({
    rawToken: multiLink.rawToken,
    newPassword: "new-password-123",
    secondKitchenName: "Nonexistent Kitchen",
  });
  assert.deepEqual(wrongKitchenAttempt, {
    success: false,
    errorCode: "SECOND_KITCHEN_MISMATCH",
  });

  // Valid second kitchen name (case-insensitive + trimmed) -> succeeds!
  const validMultiRedeem = await passwordReset.redeemPasswordResetToken({
    rawToken: multiLink.rawToken,
    newPassword: "new-password-123",
    secondKitchenName: "  wg sonnenschein  ",
  });
  assert.deepEqual(validMultiRedeem, {
    success: true,
    username: "multi_maya",
  });

  // Verify session_version incremented from 1 to 2
  const updatedMaya = users.find((u) => u.id === MULTI_USER_ID)!;
  assert.equal(updatedMaya.session_version, 2);
  assert.notEqual(updatedMaya.password_hash, "old-hash-maya");

  console.log("4. Testing Expiry & Prior Token Invalidation...");
  const firstLink = await passwordReset.createAdminPasswordResetToken({
    kitchenId: KITCHEN_A_ID,
    adminUserId: ADMIN_ID,
    targetUserId: SINGLE_USER_ID,
  });
  const secondLink = await passwordReset.createAdminPasswordResetToken({
    kitchenId: KITCHEN_A_ID,
    adminUserId: ADMIN_ID,
    targetUserId: SINGLE_USER_ID,
  });
  // First link was invalidated when second link was created
  assert.equal(
    (await passwordReset.validatePasswordResetToken(firstLink.rawToken)).valid,
    false
  );
  assert.equal(
    (await passwordReset.validatePasswordResetToken(secondLink.rawToken)).valid,
    true
  );

  // Force expiry on secondLink
  resetTokens[resetTokens.length - 1].expires_at = new Date(Date.now() - 60_000);
  assert.equal(
    (await passwordReset.validatePasswordResetToken(secondLink.rawToken)).valid,
    false
  );

  console.log("5. Testing NextAuth jwt callback session_version enforcement...");
  const jwtCb = authConfig.callbacks!.jwt!;
  // Fresh token for multi_maya (session_version is now 2)
  const validJwt = await jwtCb({
    token: { id: MULTI_USER_ID, sub: MULTI_USER_ID, session_version: 2 } as any,
    trigger: "update",
  } as any);
  assert.ok(validJwt !== null && validJwt?.id === MULTI_USER_ID);

  // Stale token (session_version: 1) must be rejected (returns null)
  const staleJwt = await jwtCb({
    token: { id: MULTI_USER_ID, sub: MULTI_USER_ID, session_version: 1 } as any,
    trigger: "update",
  } as any);
  assert.equal(staleJwt, null);

  console.log("All auth recovery & passkey tests passed!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
