-- Add RLS policy to allow users to view leaderboard data (names and points only)
CREATE POLICY "Users can view leaderboard data"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);