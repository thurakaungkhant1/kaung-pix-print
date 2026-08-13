ALTER TABLE public.game_catalog
  ADD COLUMN IF NOT EXISTS card_style text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS card_accent text NOT NULL DEFAULT '#F5B301',
  ADD COLUMN IF NOT EXISTS show_discount_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_suffix text NOT NULL DEFAULT 'MMK';

UPDATE public.game_catalog SET card_style = 'image' WHERE category_key = 'Clash of Clans';