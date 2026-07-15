
-- 1) chat_reward_logs: remove client insert; only service_role writes
DROP POLICY IF EXISTS "Users can insert their own reward log" ON public.chat_reward_logs;

-- 2) game_redemptions: enforce catalog-bound values + pending status
DROP POLICY IF EXISTS "Users can create own redemptions" ON public.game_redemptions;
CREATE POLICY "Users can create own redemptions"
ON public.game_redemptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(status, 'pending') = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.game_reward_items ri
    WHERE ri.id = reward_item_id
      AND ri.is_active = true
      AND ri.cost_points = game_redemptions.cost_points
      AND ri.reward_value = game_redemptions.reward_value
      AND ri.reward_type = game_redemptions.reward_type
  )
);

-- Ensure validation trigger is attached
DROP TRIGGER IF EXISTS trg_validate_game_redemption ON public.game_redemptions;
CREATE TRIGGER trg_validate_game_redemption
BEFORE INSERT ON public.game_redemptions
FOR EACH ROW EXECUTE FUNCTION public.validate_game_redemption();

-- 3) game_scores: cap points_earned via helper + trigger
CREATE OR REPLACE FUNCTION public.max_game_points_for(_game text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    COALESCE(
      (SELECT base_play_points + win_bonus_points + high_score_bonus_points
         FROM public.game_settings ORDER BY updated_at DESC LIMIT 1),
      35
    ),
    COALESCE(
      (SELECT points_override FROM public.mini_game_settings WHERE game_id = _game),
      0
    )
  );
$$;

DROP POLICY IF EXISTS "Users can insert own scores" ON public.game_scores;
CREATE POLICY "Users can insert own scores"
ON public.game_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(score, 0) >= 0
  AND COALESCE(points_earned, 0) >= 0
  AND COALESCE(points_earned, 0) <= public.max_game_points_for(game_name)
);

DROP TRIGGER IF EXISTS trg_validate_game_score ON public.game_scores;
CREATE TRIGGER trg_validate_game_score
BEFORE INSERT OR UPDATE ON public.game_scores
FOR EACH ROW EXECUTE FUNCTION public.validate_game_score();

-- 4) profiles: pin sensitive fields to current server value on self-update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND wallet_balance      IS NOT DISTINCT FROM (SELECT p.wallet_balance      FROM public.profiles p WHERE p.id = auth.uid())
  AND points              IS NOT DISTINCT FROM (SELECT p.points              FROM public.profiles p WHERE p.id = auth.uid())
  AND game_points         IS NOT DISTINCT FROM (SELECT p.game_points         FROM public.profiles p WHERE p.id = auth.uid())
  AND premium_ai_credits  IS NOT DISTINCT FROM (SELECT p.premium_ai_credits  FROM public.profiles p WHERE p.id = auth.uid())
  AND daily_ai_credits    IS NOT DISTINCT FROM (SELECT p.daily_ai_credits    FROM public.profiles p WHERE p.id = auth.uid())
  AND daily_credits_reset_date IS NOT DISTINCT FROM (SELECT p.daily_credits_reset_date FROM public.profiles p WHERE p.id = auth.uid())
  AND account_status      IS NOT DISTINCT FROM (SELECT p.account_status      FROM public.profiles p WHERE p.id = auth.uid())
  AND referral_code       IS NOT DISTINCT FROM (SELECT p.referral_code       FROM public.profiles p WHERE p.id = auth.uid())
  AND referred_by         IS NOT DISTINCT FROM (SELECT p.referred_by         FROM public.profiles p WHERE p.id = auth.uid())
);

-- Keep defense-in-depth trigger attached
DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();
