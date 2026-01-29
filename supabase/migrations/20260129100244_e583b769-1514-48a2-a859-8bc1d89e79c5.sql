-- Add currency support to incomes table
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'RUB';

-- Add currency column to expense_categories for default currency
ALTER TABLE public.expense_categories
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'RUB';

-- Create currencies reference table for available currencies
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  is_default boolean DEFAULT false
);

-- Enable RLS on currencies
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Everyone can read currencies
CREATE POLICY "Anyone can view currencies"
ON public.currencies
FOR SELECT
USING (true);

-- Insert common currencies
INSERT INTO public.currencies (code, name, symbol, is_default) VALUES
  ('RUB', 'Российский рубль', '₽', true),
  ('USD', 'Доллар США', '$', false),
  ('EUR', 'Евро', '€', false),
  ('GBP', 'Фунт стерлингов', '£', false),
  ('CNY', 'Китайский юань', '¥', false),
  ('KZT', 'Казахстанский тенге', '₸', false),
  ('BYN', 'Белорусский рубль', 'Br', false),
  ('UAH', 'Украинская гривна', '₴', false),
  ('TRY', 'Турецкая лира', '₺', false),
  ('AED', 'Дирхам ОАЭ', 'د.إ', false)
ON CONFLICT (code) DO NOTHING;

-- Add user's preferred default currency to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'RUB';