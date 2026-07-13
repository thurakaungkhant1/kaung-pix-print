
-- Drop overbroad realtime policies on messages (participant policies remain)
DROP POLICY IF EXISTS "Authorized realtime read" ON public.messages;
DROP POLICY IF EXISTS "Authorized realtime write" ON public.messages;

-- Remove client-side insert on wallet_transactions; keep service_role writes
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
