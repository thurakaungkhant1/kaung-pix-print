-- KGameShop auto top-up: additive columns only, no changes to existing behaviour.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_topup_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fulfillment_provider text,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_cost numeric,
  ADD COLUMN IF NOT EXISTS provider_currency text,
  ADD COLUMN IF NOT EXISTS provider_message text,
  ADD COLUMN IF NOT EXISTS provider_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_order_id_key
  ON public.orders (provider_order_id) WHERE provider_order_id IS NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kgameshop_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kgameshop_game text,
  ADD COLUMN IF NOT EXISTS kgameshop_product_id text,
  ADD COLUMN IF NOT EXISTS kgameshop_region text;

INSERT INTO public.ad_settings (setting_key, setting_value, description)
SELECT 'kgameshop_auto_topup_enabled', 'false', 'Global KGameShop auto top-up toggle'
WHERE NOT EXISTS (SELECT 1 FROM public.ad_settings WHERE setting_key = 'kgameshop_auto_topup_enabled');

-- Stamp eligibility at order creation time so toggling later never affects old orders.
CREATE OR REPLACE FUNCTION public.stamp_auto_topup_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.auto_topup_eligible := COALESCE(
    (SELECT setting_value = 'true' FROM public.ad_settings WHERE setting_key = 'kgameshop_auto_topup_enabled'),
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_auto_topup_eligibility ON public.orders;
CREATE TRIGGER trg_stamp_auto_topup_eligibility
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.stamp_auto_topup_eligibility();