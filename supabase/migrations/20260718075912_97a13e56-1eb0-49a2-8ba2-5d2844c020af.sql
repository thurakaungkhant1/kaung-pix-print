
-- Allow admins and server to insert wallet transactions (approvals were failing)
CREATE POLICY "Admins can insert wallet transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure realtime is enabled for wallet_deposits so admins get live notifications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_deposits;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.wallet_deposits REPLICA IDENTITY FULL;
