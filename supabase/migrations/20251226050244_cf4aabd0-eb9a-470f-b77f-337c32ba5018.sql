-- Add wallet_balance column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;

-- Add original_price column to products for discount display
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS original_price numeric;

-- Create wallet_deposits table for deposit requests
CREATE TABLE public.wallet_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_deposits
CREATE POLICY "Users can view own deposits"
ON public.wallet_deposits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposits"
ON public.wallet_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
ON public.wallet_deposits
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deposits"
ON public.wallet_deposits
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for deposit screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('deposit-screenshots', 'deposit-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deposit screenshots
CREATE POLICY "Users can upload deposit screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'deposit-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own deposit screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deposit-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all deposit screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deposit-screenshots' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create wallet_transactions table for tracking all wallet activities
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'purchase', 'refund')),
  reference_id uuid,
  description text,
  balance_after numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for deposits
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_deposits;