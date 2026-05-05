-- 1. Remove broad SELECT policies that allow listing public buckets
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view operator logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view background music" ON storage.objects;

-- 2. Lock down SECURITY DEFINER functions: revoke from anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.get_daily_game_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_game_points(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_daily_points_earned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_points_earned(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 3. Restrict photos table to authenticated users (currently public)
DROP POLICY IF EXISTS "Anyone can view photos" ON public.photos;
CREATE POLICY "Authenticated users can view photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (true);