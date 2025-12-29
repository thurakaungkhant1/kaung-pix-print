-- Add transaction_id column to wallet_deposits table for last 6 digits of transaction ID
ALTER TABLE public.wallet_deposits
ADD COLUMN transaction_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.wallet_deposits.transaction_id IS 'Last 6 digits of the payment transaction ID';