DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'r' AND n.nspname = 'public'
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
    END LOOP;
END;
$$;

-- Public-readable tables (permissive read policies) also need anon SELECT
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.shop_categories TO anon;
GRANT SELECT ON public.shop_items TO anon;
GRANT SELECT ON public.physical_categories TO anon;
GRANT SELECT ON public.digital_categories TO anon;
GRANT SELECT ON public.digital_product_plans TO anon;
GRANT SELECT ON public.promotional_banners TO anon;
GRANT SELECT ON public.ad_placements TO anon;
GRANT SELECT ON public.ad_settings TO anon;
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT ON public.mobile_operators TO anon;
GRANT SELECT ON public.mlbb_diamond_tiers TO anon;
GRANT SELECT ON public.photos TO anon;
GRANT SELECT ON public.background_music TO anon;
GRANT SELECT ON public.ai_styles TO anon;
GRANT SELECT ON public.passport_photo_prompts TO anon;
GRANT SELECT ON public.popular_prompts TO anon;
GRANT SELECT ON public.premium_plans TO anon;
GRANT SELECT ON public.game_reward_items TO anon;
GRANT SELECT ON public.game_settings TO anon;
GRANT SELECT ON public.mini_game_settings TO anon;
GRANT SELECT ON public.withdrawal_items TO anon;
GRANT SELECT ON public.withdrawal_settings TO anon;
GRANT SELECT ON public.product_reviews TO anon;