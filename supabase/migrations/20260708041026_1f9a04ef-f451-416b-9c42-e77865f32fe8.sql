
REVOKE EXECUTE ON FUNCTION public.search_public_profiles(text, text, int) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, text, int) TO authenticated;
