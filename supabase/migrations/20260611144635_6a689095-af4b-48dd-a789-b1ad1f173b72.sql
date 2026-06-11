CREATE POLICY "Recipients can mark messages as read"
ON public.messages FOR UPDATE
USING (
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() <> sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);