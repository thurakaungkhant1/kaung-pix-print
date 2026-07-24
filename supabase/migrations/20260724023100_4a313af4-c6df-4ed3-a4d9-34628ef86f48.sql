
-- Restrict realtime topic access: only allow subscribing/broadcasting to
-- topics named "conversation:<uuid>" where the caller participates.
CREATE OR REPLACE FUNCTION public.can_access_conversation_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
BEGIN
  IF auth.uid() IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;
  IF _topic !~ '^conversation:[0-9a-f-]{36}$' THEN
    RETURN false;
  END IF;
  BEGIN
    _cid := substring(_topic from 14)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _cid
      AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  );
END;
$$;

DROP POLICY IF EXISTS "Authorized realtime read" ON realtime.messages;
DROP POLICY IF EXISTS "Authorized realtime write" ON realtime.messages;

CREATE POLICY "Participants can read conversation topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_conversation_topic((SELECT realtime.topic())));

CREATE POLICY "Participants can write conversation topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_conversation_topic((SELECT realtime.topic())));
