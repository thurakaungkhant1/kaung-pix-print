-- Fix 1: Restrict sender UPDATE on messages to soft-delete only
-- Column-level grants ensure senders can only touch is_deleted (soft-delete)
-- and recipients only touch read_at. Combined with existing RLS policies.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (is_deleted, read_at) ON public.messages TO authenticated;

-- Tighten the sender's UPDATE policy with a WITH CHECK that requires soft-delete
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can soft-delete their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id AND is_deleted = true);

-- Fix 2: Remove overly-broad uploader-only SELECT policies on chat-images / chat-voices.
-- Recipient access is granted through the conversation-scoped policies
-- ("Users can view chat images/voices in their conversations") which we (re)create below
-- to guarantee they exist and match the chat-media pattern.
DROP POLICY IF EXISTS "Users can view own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own chat voices" ON storage.objects;

DROP POLICY IF EXISTS "Users can view chat images in their conversations" ON storage.objects;
CREATE POLICY "Users can view chat images in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.media_url = storage.objects.name
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view chat voices in their conversations" ON storage.objects;
CREATE POLICY "Users can view chat voices in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-voices'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.media_url = storage.objects.name
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);