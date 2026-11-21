-- Migration: Passkeys (WebAuthn), Co-Verified Admin Password Reset Tokens, and Session Versioning
-- Issue: #42 (Forgotten password recovery)

-- 1. Session versioning on users so password resets / changes / "sign out all" invalidate older JWTs
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

-- 2. WebAuthn Passkeys
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[],
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id
  ON public.user_passkeys (user_id);

-- 3. Co-Verified Admin Password Reset Tokens (15-min single-use, SHA-256 hashed)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kitchen_id UUID NOT NULL REFERENCES public.kitchens(id) ON DELETE CASCADE,
  created_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token_hash TEXT UNIQUE NOT NULL,
  requires_second_kitchen_check BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
  ON public.password_reset_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
  ON public.password_reset_tokens (expires_at)
  WHERE used_at IS NULL;
