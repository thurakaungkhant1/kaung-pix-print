
-- 1. Recreate public_profiles view with points exposed
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  avatar_url,
  account_status,
  is_active_visible,
  CASE
    WHEN last_seen_privacy = 'public'::text THEN last_seen_at
    WHEN auth.uid() = id THEN last_seen_at
    WHEN auth.uid() IS NOT NULL AND (EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'accepted'::text
        AND ((fr.sender_id = auth.uid() AND fr.receiver_id = p.id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = p.id))
    )) THEN last_seen_at
    ELSE NULL::timestamp with time zone
  END AS last_seen_at,
  last_seen_privacy,
  created_at,
  points,
  game_points,
  (COALESCE(points, 0) + COALESCE(game_points, 0)) AS total_coins
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2. Top referrers RPC (admin only)
CREATE OR REPLACE FUNCTION public.get_top_referrers(limit_count integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  avatar_url text,
  referral_count bigint,
  points integer,
  game_points integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.avatar_url,
    COUNT(r.id) AS referral_count,
    p.points,
    p.game_points,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.profiles r ON r.referred_by = p.id
  GROUP BY p.id
  HAVING COUNT(r.id) > 0
  ORDER BY referral_count DESC, p.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 50), 500));
END;
$$;

-- 3. Admin bonus grant function
CREATE OR REPLACE FUNCTION public.admin_grant_coin_bonus(
  target_user_id uuid,
  bonus_amount integer,
  note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF bonus_amount IS NULL OR bonus_amount = 0 THEN
    RAISE EXCEPTION 'Bonus amount must be non-zero';
  END IF;

  IF bonus_amount < -1000000 OR bonus_amount > 1000000 THEN
    RAISE EXCEPTION 'Bonus amount out of range';
  END IF;

  UPDATE public.profiles
  SET points = GREATEST(0, COALESCE(points, 0) + bonus_amount)
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
  VALUES (
    target_user_id,
    bonus_amount,
    'admin_bonus',
    COALESCE(note, 'Admin referral bonus')
  );

  INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
  VALUES (
    CASE WHEN bonus_amount > 0 THEN 'Bonus Coins ရရှိပါပြီ' ELSE 'Coin ပြင်ဆင်ခြင်း' END,
    'Admin မှ coin ' || bonus_amount::text || ' ကို သင့်အကောင့်သို့ ထည့်ပေးလိုက်ပါသည်။' || COALESCE(' — ' || note, ''),
    'user',
    target_user_id,
    auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_referrers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_coin_bonus(uuid, integer, text) TO authenticated;
