-- Fix 1: Profiles data exposure - Create leaderboard view with only safe fields

-- Create a secure view for leaderboard that only exposes non-sensitive data
CREATE VIEW public.leaderboard AS
SELECT id, name, points, created_at
FROM public.profiles
ORDER BY points DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.leaderboard TO authenticated;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view leaderboard data" ON public.profiles;

-- Fix 2: Make chat-media bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'chat-media';

-- Drop the public view policy if it exists
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- Create policy for authenticated users to view their own conversation media
CREATE POLICY "Users can view chat media in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.media_url LIKE '%' || storage.objects.name
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);