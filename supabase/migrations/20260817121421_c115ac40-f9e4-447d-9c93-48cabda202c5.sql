
DROP POLICY IF EXISTS "Users can create deposits" ON public.wallet_deposits;
CREATE POLICY "Users can create deposits" ON public.wallet_deposits
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_by IS NULL AND approved_at IS NULL
  AND rejected_by IS NULL AND rejected_at IS NULL
  AND amount > 0
);

DROP POLICY IF EXISTS "Users can create purchase requests" ON public.premium_purchase_requests;
CREATE POLICY "Users can create purchase requests" ON public.premium_purchase_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_by IS NULL AND approved_at IS NULL
  AND rejected_at IS NULL AND rejection_reason IS NULL
);

DROP POLICY IF EXISTS "Users insert own invitations" ON public.ai_invitations;
CREATE POLICY "Users insert own invitations" ON public.ai_invitations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND paid = false
  AND status = 'pending'
  AND approved_by IS NULL AND approved_at IS NULL
);

DROP POLICY IF EXISTS "Users insert own gift links" ON public.ai_gift_links;
CREATE POLICY "Users insert own gift links" ON public.ai_gift_links
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND views = 0
);

DROP POLICY IF EXISTS "Users can update own missions" ON public.daily_missions;
CREATE POLICY "Users can update own missions" ON public.daily_missions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND bonus_claimed = false);
