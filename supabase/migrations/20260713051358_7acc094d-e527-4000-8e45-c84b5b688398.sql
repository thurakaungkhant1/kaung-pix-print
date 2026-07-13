
-- 1) ad_settings: restrict SELECT so sensitive credential rows are admin-only
DROP POLICY IF EXISTS "Anyone can view ad settings" ON public.ad_settings;

CREATE POLICY "Public can view non-sensitive ad settings"
  ON public.ad_settings
  FOR SELECT
  USING (
    setting_key NOT IN (
      'smile_api_key',
      'smile_partner_id',
      'smile_secret',
      'auto_topup_enabled'
    )
    AND setting_key NOT ILIKE '%api_key%'
    AND setting_key NOT ILIKE '%secret%'
    AND setting_key NOT ILIKE '%token%'
    AND setting_key NOT ILIKE '%password%'
  );

CREATE POLICY "Admins can view all ad settings"
  ON public.ad_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) profiles: block self-writes to sensitive economic columns
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if executed by service_role (edge functions) or by admin
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance can only be changed by the server';
  END IF;
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'points can only be changed by the server';
  END IF;
  IF NEW.game_points IS DISTINCT FROM OLD.game_points THEN
    RAISE EXCEPTION 'game_points can only be changed by the server';
  END IF;
  IF NEW.premium_ai_credits IS DISTINCT FROM OLD.premium_ai_credits THEN
    RAISE EXCEPTION 'premium_ai_credits can only be changed by the server';
  END IF;
  IF NEW.daily_ai_credits IS DISTINCT FROM OLD.daily_ai_credits THEN
    RAISE EXCEPTION 'daily_ai_credits can only be changed by the server';
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'account_status can only be changed by admins';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code cannot be changed';
  END IF;
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referred_by cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();
