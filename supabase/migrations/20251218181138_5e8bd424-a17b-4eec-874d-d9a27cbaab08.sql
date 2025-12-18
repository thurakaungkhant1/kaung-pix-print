-- Fix the SECURITY DEFINER view issue by making it SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard
WITH (security_invoker = true)
AS
SELECT id, name, points, created_at
FROM public.profiles
ORDER BY points DESC;

-- Re-grant access
GRANT SELECT ON public.leaderboard TO authenticated;