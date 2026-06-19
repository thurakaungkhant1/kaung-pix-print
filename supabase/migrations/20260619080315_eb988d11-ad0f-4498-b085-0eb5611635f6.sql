
DROP POLICY IF EXISTS "Users can view chat media in their conversations" ON storage.objects;
CREATE POLICY "Users can view chat media in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (
      m.media_url = objects.name
      OR split_part(m.media_url, '/chat-media/', 2) = objects.name
    )
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view own chat images" ON storage.objects;
CREATE POLICY "Users can view own chat images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can insert their own premium membership" ON premium_memberships;
DROP POLICY IF EXISTS "Users can update their own premium membership" ON premium_memberships;
