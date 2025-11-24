-- Create point_transactions table for tracking all point changes
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL, -- 'spin', 'purchase', 'withdrawal'
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.point_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert transactions (will be done via edge function or client)
CREATE POLICY "Authenticated users can insert transactions"
ON public.point_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create spinner_spins table to track daily spin usage
CREATE TABLE public.spinner_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  points_won integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

-- Enable RLS
ALTER TABLE public.spinner_spins ENABLE ROW LEVEL SECURITY;

-- Users can view their own spins
CREATE POLICY "Users can view own spins"
ON public.spinner_spins
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own spins
CREATE POLICY "Users can insert own spins"
ON public.spinner_spins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create point_withdrawals table
CREATE TABLE public.point_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_withdrawn integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.point_withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals"
ON public.point_withdrawals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawals"
ON public.point_withdrawals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
ON public.point_withdrawals
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update withdrawal status
CREATE POLICY "Admins can update withdrawals"
ON public.point_withdrawals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));