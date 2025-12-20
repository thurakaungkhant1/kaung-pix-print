-- Create update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create premium_memberships table
CREATE TABLE public.premium_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  total_chat_points_earned numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.premium_memberships ENABLE ROW LEVEL SECURITY;

-- Policies for premium_memberships
CREATE POLICY "Users can view their own premium membership" 
ON public.premium_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own premium membership" 
ON public.premium_memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own premium membership" 
ON public.premium_memberships 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all premium memberships" 
ON public.premium_memberships 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all premium memberships" 
ON public.premium_memberships 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updating updated_at
CREATE TRIGGER update_premium_memberships_updated_at
BEFORE UPDATE ON public.premium_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for premium_memberships
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_memberships;