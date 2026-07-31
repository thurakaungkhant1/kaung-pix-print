CREATE UNIQUE INDEX IF NOT EXISTS wallet_deposits_unique_active_txid
ON public.wallet_deposits (transaction_id)
WHERE transaction_id IS NOT NULL AND status <> 'rejected';