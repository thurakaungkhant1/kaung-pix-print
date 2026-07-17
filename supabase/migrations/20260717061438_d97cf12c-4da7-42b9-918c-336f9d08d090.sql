
-- 1) auth_error_logs: block client inserts; only service_role writes via edge function
DROP POLICY IF EXISTS "auth_error_logs_anyone_insert" ON public.auth_error_logs;
DROP POLICY IF EXISTS "auth_error_logs_insert_constrained" ON public.auth_error_logs;

REVOKE INSERT ON public.auth_error_logs FROM anon, authenticated;

-- No INSERT policy for anon/authenticated => inserts denied by RLS.
-- service_role bypasses RLS, so the edge function keeps working.

-- 2) messages: ensure any topic-based realtime policies are removed
DROP POLICY IF EXISTS "Authorized realtime read" ON public.messages;
DROP POLICY IF EXISTS "Authorized realtime write" ON public.messages;
DROP POLICY IF EXISTS "Realtime authorized read" ON public.messages;
DROP POLICY IF EXISTS "Realtime authorized write" ON public.messages;
DROP POLICY IF EXISTS "messages_realtime_read" ON public.messages;
DROP POLICY IF EXISTS "messages_realtime_write" ON public.messages;
