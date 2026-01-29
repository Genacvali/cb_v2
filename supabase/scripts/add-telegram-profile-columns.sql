-- Run this in Supabase Dashboard → SQL Editor if you get
-- "Could not find the 'telegram_link_code' column of 'profiles' in the schema cache"
-- Then refresh the schema / reload the app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_link_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_linked_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id
  ON public.profiles(telegram_id) WHERE telegram_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_link_code
  ON public.profiles(telegram_link_code) WHERE telegram_link_code IS NOT NULL;
