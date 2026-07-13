
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE (id uuid, name text, email text, avatar_url text, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
