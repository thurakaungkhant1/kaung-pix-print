
-- Add cost_price (admin-only) to product tables for profit tracking
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.digital_product_plans ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.mlbb_diamond_tiers ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;
