
-- =========================================================================
-- 1) PROFILES: attach existing sensitive-field guard trigger
-- =========================================================================
DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

-- =========================================================================
-- 2) ORDERS: restrict user INSERT + attach validation/awarding triggers
-- =========================================================================
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (status IS NULL OR status = 'pending')
  AND COALESCE(points_awarded, false) = false
);

DROP TRIGGER IF EXISTS trg_orders_set_type ON public.orders;
CREATE TRIGGER trg_orders_set_type
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_type();

DROP TRIGGER IF EXISTS trg_orders_validate_price ON public.orders;
CREATE TRIGGER trg_orders_validate_price
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_price();

DROP TRIGGER IF EXISTS trg_orders_award_points ON public.orders;
CREATE TRIGGER trg_orders_award_points
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_order_finish();

-- =========================================================================
-- 3) GAME_SCORES: cap points_earned against server-side game_settings
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_game_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.game_settings%ROWTYPE;
  max_points integer;
  override_pts integer;
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot submit scores for another user';
  END IF;

  SELECT * INTO s FROM public.game_settings ORDER BY updated_at DESC LIMIT 1;

  -- Maximum legitimate points per submission
  max_points := COALESCE(s.base_play_points, 5)
              + COALESCE(s.win_bonus_points, 20)
              + COALESCE(s.high_score_bonus_points, 10);

  -- Per-game override cap (if configured)
  SELECT points_override INTO override_pts
  FROM public.mini_game_settings
  WHERE game_id = NEW.game_name;
  IF override_pts IS NOT NULL AND override_pts > max_points THEN
    max_points := override_pts;
  END IF;

  IF COALESCE(NEW.points_earned, 0) < 0 THEN
    NEW.points_earned := 0;
  END IF;

  IF NEW.points_earned > max_points THEN
    RAISE EXCEPTION 'points_earned % exceeds allowed max %', NEW.points_earned, max_points;
  END IF;

  IF COALESCE(NEW.score, 0) < 0 THEN
    NEW.score := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_game_score ON public.game_scores;
CREATE TRIGGER trg_validate_game_score
BEFORE INSERT OR UPDATE ON public.game_scores
FOR EACH ROW EXECUTE FUNCTION public.validate_game_score();

-- =========================================================================
-- 4) DAILY_MISSIONS: users cannot self-claim bonus
-- =========================================================================
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
    -- Never allow starting with claimed bonus or completed missions
    NEW.bonus_claimed := false;
    NEW.missions_completed := false;
    IF COALESCE(NEW.games_played, 0) < 0 THEN NEW.games_played := 0; END IF;
    IF COALESCE(NEW.games_won, 0) < 0 THEN NEW.games_won := 0; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- bonus_claimed can only be flipped by service_role/admin
    IF NEW.bonus_claimed IS DISTINCT FROM OLD.bonus_claimed
       AND COALESCE(NEW.bonus_claimed, false) = true THEN
      RAISE EXCEPTION 'bonus_claimed can only be set by the server';
    END IF;
    -- counters cannot decrease and cannot jump by more than a reasonable amount per update
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
    -- Prevent tampering with date field
    IF NEW.mission_date IS DISTINCT FROM OLD.mission_date THEN
      NEW.mission_date := OLD.mission_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_daily_mission ON public.daily_missions;
CREATE TRIGGER trg_validate_daily_mission
BEFORE INSERT OR UPDATE ON public.daily_missions
FOR EACH ROW EXECUTE FUNCTION public.validate_daily_mission();

-- =========================================================================
-- 5) GAME_STREAKS: users can only increment by 1 per day
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_game_streak()
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
    RAISE EXCEPTION 'Cannot modify streak for another user';
  END IF;

  IF COALESCE(NEW.current_streak, 0) < 0 THEN NEW.current_streak := 0; END IF;
  IF COALESCE(NEW.longest_streak, 0) < 0 THEN NEW.longest_streak := 0; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.current_streak > 1 THEN NEW.current_streak := 1; END IF;
    IF NEW.longest_streak > NEW.current_streak THEN NEW.longest_streak := NEW.current_streak; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- current_streak may only reset to 0/1 or increment by 1 from prior value
    IF NEW.current_streak > COALESCE(OLD.current_streak, 0) + 1 THEN
      RAISE EXCEPTION 'current_streak may increment by at most 1';
    END IF;
    -- longest_streak may only grow to at most current_streak
    IF NEW.longest_streak > GREATEST(COALESCE(OLD.longest_streak, 0), COALESCE(NEW.current_streak, 0)) THEN
      RAISE EXCEPTION 'longest_streak cannot exceed current_streak / previous longest';
    END IF;
    -- Only one increment per day
    IF NEW.last_played_date IS NOT NULL
       AND OLD.last_played_date IS NOT NULL
       AND NEW.last_played_date = OLD.last_played_date
       AND NEW.current_streak > OLD.current_streak THEN
      RAISE EXCEPTION 'Streak already updated for this day';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_game_streak ON public.game_streaks;
CREATE TRIGGER trg_validate_game_streak
BEFORE INSERT OR UPDATE ON public.game_streaks
FOR EACH ROW EXECUTE FUNCTION public.validate_game_streak();

-- =========================================================================
-- 6) SPINNER_SPINS: 1 spin/day, fixed 5 points
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_spinner_spin()
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
    RAISE EXCEPTION 'Cannot spin for another user';
  END IF;

  IF NEW.spin_date IS NULL THEN NEW.spin_date := CURRENT_DATE; END IF;
  IF NEW.spin_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'spin_date must be today';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.spinner_spins
    WHERE user_id = NEW.user_id AND spin_date = NEW.spin_date
  ) THEN
    RAISE EXCEPTION 'Already spun today';
  END IF;

  -- Fixed reward (5 points as per project rules)
  IF COALESCE(NEW.points_won, 0) <> 5 THEN
    NEW.points_won := 5;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_spinner_spin ON public.spinner_spins;
CREATE TRIGGER trg_validate_spinner_spin
BEFORE INSERT ON public.spinner_spins
FOR EACH ROW EXECUTE FUNCTION public.validate_spinner_spin();
