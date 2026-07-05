
-- 1) Audit trail for every point/coin credit
CREATE TABLE public.point_credit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.point_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  source text NOT NULL,           -- 'chat' | 'arcade' | 'game' | 'spin' | 'welcome' | 'referral' | 'order' | 'admin_grant'
  reason text,                    -- 'ok' | 'cooldown' | 'daily_cap' | 'vpn_required' | 'too_short' | 'duplicate' | 'admin' | ...
  actor text NOT NULL DEFAULT 'service_role',  -- 'service_role' | 'user' | 'admin'
  actor_user_id uuid,             -- present when an admin grants on behalf of a user
  related_entity text,            -- 'order' | 'game_score' | 'arcade_session' | 'chat_message' | 'referral' | null
  related_entity_id text,
  ip inet,
  user_agent text,
  country text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX point_credit_audit_user_created_idx
  ON public.point_credit_audit (user_id, created_at DESC);
CREATE INDEX point_credit_audit_transaction_idx
  ON public.point_credit_audit (transaction_id);

GRANT SELECT ON public.point_credit_audit TO authenticated;
GRANT ALL ON public.point_credit_audit TO service_role;

ALTER TABLE public.point_credit_audit ENABLE ROW LEVEL SECURITY;

-- Users see audit for their own credits
CREATE POLICY "Users can view own credit audit"
ON public.point_credit_audit FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can see everything
CREATE POLICY "Admins can view all credit audit"
ON public.point_credit_audit FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No client-side inserts/updates/deletes. Only service_role writes.

-- 2) Expand public_profiles view to expose game_points for leaderboards.
--    Everything sensitive (email, phone, points, wallet_balance, referred_by, ...) stays out.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  avatar_url,
  account_status,
  is_active_visible,
  last_seen_at,
  created_at,
  game_points
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 3) Realtime channel authorization
-- Allowed broadcast/presence topics (documented for the codebase):
--   - 'presence:global'                    → global online users (any authenticated user)
--   - 'notifications:<auth.uid()>'         → per-user notifications
--   - 'conversation:<conversation_id>'     → chat between the two participants
--   - 'support:<auth.uid()>'               → user's own support thread
--   - 'support:admin'                      → admin/mobile_admin control channel
-- Everything else is denied.

CREATE OR REPLACE FUNCTION realtime.can_access_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF _topic = 'presence:global' THEN
    RETURN true;
  END IF;

  IF _topic = 'notifications:' || uid::text THEN
    RETURN true;
  END IF;

  IF _topic = 'support:' || uid::text THEN
    RETURN true;
  END IF;

  IF _topic = 'support:admin'
     AND (public.has_role(uid, 'admin') OR public.has_role(uid, 'mobile_admin')) THEN
    RETURN true;
  END IF;

  IF starts_with(_topic, 'conversation:') THEN
    conv_id := substring(_topic from length('conversation:') + 1);
    IF conv_id ~ '^[0-9a-fA-F-]{36}$' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conv_id::uuid
          AND (c.participant1_id = uid OR c.participant2_id = uid)
      );
    END IF;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Authenticated presence global read" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated presence global write" ON realtime.messages;

CREATE POLICY "Authorized realtime read"
ON realtime.messages FOR SELECT
TO authenticated
USING (realtime.can_access_topic((SELECT realtime.topic())));

CREATE POLICY "Authorized realtime write"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (realtime.can_access_topic((SELECT realtime.topic())));

-- 4) Keep the point_transactions insert policy tight (already there):
--    authenticated may only insert non-positive amounts (spends).
--    All positive credits must flow through service_role via edge functions.
--    We recreate to add explicit documentation via COMMENT.
COMMENT ON TABLE public.point_transactions IS
  'Positive credits (amount > 0) must be inserted by edge functions using service_role. Client role can only insert amount <= 0 (spends). Every service_role credit must also write a matching row into point_credit_audit.';
