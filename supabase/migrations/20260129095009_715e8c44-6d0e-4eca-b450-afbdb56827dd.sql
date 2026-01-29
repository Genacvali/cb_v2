-- Add telegram integration fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_link_code text UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_linked_at timestamp with time zone;

-- Create index for faster telegram_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id) WHERE telegram_id IS NOT NULL;

-- Create index for link code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_link_code ON public.profiles(telegram_link_code) WHERE telegram_link_code IS NOT NULL;