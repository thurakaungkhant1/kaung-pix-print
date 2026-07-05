
-- 1. chat_media_url_split_part_bypass
DROP POLICY IF EXISTS "Users can view chat media in their conversations" ON storage.objects;
CREATE POLICY "Users can view chat media in their conversations"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.media_url = objects.name
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- 2. chat_voices_unauthenticated_select
DROP POLICY IF EXISTS "Authenticated users can read chat-voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat voices" ON storage.objects;

CREATE POLICY "Users can view own chat voices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-voices'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat voices in their conversations"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-voices'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.media_url = objects.name
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- 3. point_transactions_unauthenticated_insert
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.point_transactions;
CREATE POLICY "Users can insert their own spending transactions"
ON public.point_transactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND amount <= 0
);

-- 4. profiles_sensitive_data_authenticated_exposure
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  avatar_url,
  account_status,
  is_active_visible,
  last_seen_at,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- 5. realtime_no_channel_authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated presence global read" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated presence global write" ON realtime.messages;

CREATE POLICY "Authenticated presence global read"
ON realtime.messages FOR SELECT TO authenticated
USING ((SELECT realtime.topic()) = 'presence:global');

CREATE POLICY "Authenticated presence global write"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK ((SELECT realtime.topic()) = 'presence:global');

-- 6. SUPA_rls_policy_always_true
DROP POLICY IF EXISTS "auth_error_logs_anyone_insert" ON public.auth_error_logs;
CREATE POLICY "auth_error_logs_insert_constrained"
ON public.auth_error_logs FOR INSERT
TO anon, authenticated
WITH CHECK (
  provider IS NOT NULL
  AND length(provider) BETWEEN 1 AND 50
  AND (error_code IS NULL OR length(error_code) <= 100)
  AND (error_message IS NULL OR length(error_message) <= 2000)
  AND (url IS NULL OR length(url) <= 2048)
  AND (user_agent IS NULL OR length(user_agent) <= 1024)
);
