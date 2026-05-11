GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT USAGE ON TYPE public.app_role TO authenticated, anon;