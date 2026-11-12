-- Migration: Add Declined Refund Status & Receipt Cleanup Tracking
-- Description: Adds is_declined, declined_at, and decline_reason to public.checkouts

ALTER TABLE public.checkouts
  ADD COLUMN IF NOT EXISTS is_declined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Index to optimize querying open/declined/settled checkouts by kitchen
CREATE INDEX IF NOT EXISTS idx_checkouts_kitchen_declined
  ON public.checkouts (kitchen_id, is_declined);
