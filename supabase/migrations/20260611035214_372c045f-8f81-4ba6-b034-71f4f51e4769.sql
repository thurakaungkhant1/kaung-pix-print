
-- 1. Drop legacy download_pin columns (PINs now live only in photo_pins, verified server-side)
DROP INDEX IF EXISTS public.idx_profiles_download_pin;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS download_pin;
ALTER TABLE public.photos DROP COLUMN IF EXISTS download_pin;

-- 2. Replace insecure chat-media SELECT policy (suffix LIKE -> exact match)
DROP POLICY IF EXISTS "Users can view chat media in their conversations" ON storage.objects;

CREATE POLICY "Users can view chat media in their conversations"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE (
        m.media_url = storage.objects.name
        OR m.media_url LIKE '%/storage/v1/object/%/chat-media/' || storage.objects.name
        OR split_part(m.media_url, '/chat-media/', 2) = storage.objects.name
      )
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);
