
-- 1) ban_reason lock on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bypass text;
BEGIN
  bypass := current_setting('app.wallet_bypass', true);

  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR bypass = 'on' THEN
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
  IF NEW.daily_credits_reset_date IS DISTINCT FROM OLD.daily_credits_reset_date THEN
    RAISE EXCEPTION 'daily_credits_reset_date can only be changed by the server';
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'account_status can only be changed by admins';
  END IF;
  IF NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
    RAISE EXCEPTION 'ban_reason can only be changed by admins';
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

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (wallet_balance IS DISTINCT FROM (SELECT p.wallet_balance FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (points IS DISTINCT FROM (SELECT p.points FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (game_points IS DISTINCT FROM (SELECT p.game_points FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (premium_ai_credits IS DISTINCT FROM (SELECT p.premium_ai_credits FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (daily_ai_credits IS DISTINCT FROM (SELECT p.daily_ai_credits FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (daily_credits_reset_date IS DISTINCT FROM (SELECT p.daily_credits_reset_date FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (account_status IS DISTINCT FROM (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (ban_reason IS DISTINCT FROM (SELECT p.ban_reason FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (referred_by IS DISTINCT FROM (SELECT p.referred_by FROM public.profiles p WHERE p.id = auth.uid()))
);

-- 2) ai_gift_links: server-controlled cost + status
CREATE OR REPLACE FUNCTION public.validate_ai_gift_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot create gift links for another user';
  END IF;

  SELECT gift_cost_coins INTO v_cost FROM public.ai_usage_settings LIMIT 1;
  NEW.cost_coins := COALESCE(v_cost, 0);
  NEW.status := 'pending';
  NEW.views := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ai_gift_link ON public.ai_gift_links;
CREATE TRIGGER trg_validate_ai_gift_link
BEFORE INSERT ON public.ai_gift_links
FOR EACH ROW EXECUTE FUNCTION public.validate_ai_gift_link();

-- 3) ai_photo_generations: server-controlled cost + status
CREATE OR REPLACE FUNCTION public.validate_ai_photo_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot create generations for another user';
  END IF;

  SELECT photo_cost_coins INTO v_cost FROM public.ai_usage_settings LIMIT 1;
  NEW.cost_coins := COALESCE(v_cost, 0);
  NEW.status := 'pending';
  NEW.result_image_url := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ai_photo_generation ON public.ai_photo_generations;
CREATE TRIGGER trg_validate_ai_photo_generation
BEFORE INSERT ON public.ai_photo_generations
FOR EACH ROW EXECUTE FUNCTION public.validate_ai_photo_generation();

-- 4) daily_missions: missions_completed derived from real progress
CREATE OR REPLACE FUNCTION public.validate_daily_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify missions for another user';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.bonus_claimed := false;
    NEW.missions_completed := false;
    IF COALESCE(NEW.games_played, 0) < 0 THEN NEW.games_played := 0; END IF;
    IF COALESCE(NEW.games_won, 0) < 0 THEN NEW.games_won := 0; END IF;
    IF COALESCE(NEW.games_played, 0) > 1 THEN NEW.games_played := 1; END IF;
    IF COALESCE(NEW.games_won, 0) > 1 THEN NEW.games_won := 1; END IF;
    IF NEW.mission_date IS DISTINCT FROM CURRENT_DATE THEN
      NEW.mission_date := CURRENT_DATE;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.bonus_claimed IS DISTINCT FROM OLD.bonus_claimed
       AND COALESCE(NEW.bonus_claimed, false) = true THEN
      RAISE EXCEPTION 'bonus_claimed can only be set by the server';
    END IF;
    IF COALESCE(NEW.games_played, 0) < COALESCE(OLD.games_played, 0) THEN
      NEW.games_played := OLD.games_played;
    END IF;
    IF COALESCE(NEW.games_won, 0) < COALESCE(OLD.games_won, 0) THEN
      NEW.games_won := OLD.games_won;
    END IF;
    IF COALESCE(NEW.games_played, 0) - COALESCE(OLD.games_played, 0) > 1 THEN
      RAISE EXCEPTION 'games_played may increment by at most 1 per update';
    END IF;
    IF COALESCE(NEW.games_won, 0) - COALESCE(OLD.games_won, 0) > 1 THEN
      RAISE EXCEPTION 'games_won may increment by at most 1 per update';
    END IF;
    IF COALESCE(NEW.games_won, 0) > COALESCE(NEW.games_played, 0) THEN
      NEW.games_won := NEW.games_played;
    END IF;
    IF NEW.mission_date IS DISTINCT FROM OLD.mission_date THEN
      NEW.mission_date := OLD.mission_date;
    END IF;
    NEW.user_id := OLD.user_id;
  END IF;

  -- completion is always derived, never client-asserted
  NEW.missions_completed := COALESCE(NEW.games_played, 0) >= 3;
  RETURN NEW;
END;
$$;

-- 5) spinner_spins: explicit policy-level bound on points_won
DROP POLICY IF EXISTS "Users can insert own spins" ON public.spinner_spins;
CREATE POLICY "Users can insert own spins"
ON public.spinner_spins FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND spin_date = CURRENT_DATE
  AND points_won BETWEEN 0 AND 5
);
