
DROP VIEW IF EXISTS public.game_leaderboard;

CREATE VIEW public.game_leaderboard 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.avatar_url,
  p.game_points,
  COUNT(gs.id) as total_games,
  COUNT(CASE WHEN gs.is_win THEN 1 END) as total_wins
FROM public.profiles p
LEFT JOIN public.game_scores gs ON gs.user_id = p.id
GROUP BY p.id, p.name, p.avatar_url, p.game_points
ORDER BY p.game_points DESC;
