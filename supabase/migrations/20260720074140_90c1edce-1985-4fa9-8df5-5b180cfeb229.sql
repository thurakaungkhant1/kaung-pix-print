
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker=off) AS
SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.account_status,
  p.is_active_visible,
  CASE
    WHEN p.last_seen_privacy = 'public' THEN p.last_seen_at
    WHEN auth.uid() = p.id THEN p.last_seen_at
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'accepted'
        AND ((fr.sender_id = auth.uid() AND fr.receiver_id = p.id)
          OR (fr.receiver_id = auth.uid() AND fr.sender_id = p.id))
    ) THEN p.last_seen_at
    ELSE NULL
  END AS last_seen_at,
  p.last_seen_privacy,
  p.created_at,
  p.points,
  p.game_points,
  COALESCE(p.points,0) + COALESCE(p.game_points,0) AS total_coins
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
