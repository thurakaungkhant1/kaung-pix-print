CREATE OR REPLACE FUNCTION public.award_offline_game_points(p_score integer, p_points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_daily_points integer;
  v_awarded integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_score < 0 OR p_points < 0 OR p_points > 50 THEN
    RAISE EXCEPTION 'Invalid offline game reward';
  END IF;

  SELECT COALESCE(SUM(points_earned), 0)::integer
  INTO v_daily_points
  FROM public.game_scores
  WHERE user_id = v_user_id
    AND created_at >= date_trunc('day', now());

  v_awarded := LEAST(p_points, GREATEST(0, 500 - v_daily_points));

  IF v_awarded > 0 THEN
    INSERT INTO public.game_scores (user_id, game_name, score, is_win, points_earned)
    VALUES (v_user_id, 'Offline Runner', p_score, p_score >= 100, v_awarded);

    UPDATE public.profiles
    SET game_points = COALESCE(game_points, 0) + v_awarded
    WHERE id = v_user_id;
  END IF;

  RETURN v_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.award_offline_game_points(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_offline_game_points(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_offline_game_points(integer, integer) TO service_role;