
-- 1) Fix SECURITY DEFINER view: convert public_profiles to security_invoker
--    view backed by a SECURITY DEFINER function that returns only safe columns.

CREATE OR REPLACE FUNCTION public._public_profiles_rows()
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  account_status text,
  is_active_visible boolean,
  last_seen_at timestamptz,
  last_seen_privacy text,
  created_at timestamptz,
  points integer,
  game_points integer,
  total_coins integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    (COALESCE(p.points, 0) + COALESCE(p.game_points, 0))::int AS total_coins
  FROM public.profiles p;
$$;

REVOKE ALL ON FUNCTION public._public_profiles_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._public_profiles_rows() TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS SELECT * FROM public._public_profiles_rows();

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Fix public bucket listing: remove broad SELECT on avatars.
--    Public URLs still work (they bypass RLS via /object/public/...).
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

-- Allow users to see their own avatar rows for delete/update flows.
CREATE POLICY "Users can view their own avatar row"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
