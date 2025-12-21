-- Create premium purchase requests table for pending approval workflow
CREATE TABLE public.premium_purchase_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.premium_plans(id),
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  points_per_minute numeric NOT NULL DEFAULT 0.01,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  rejected_at timestamp with time zone,
  rejection_reason text
);

-- Enable RLS
ALTER TABLE public.premium_purchase_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own purchase requests" 
ON public.premium_purchase_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchase requests" 
ON public.premium_purchase_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchase requests" 
ON public.premium_purchase_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update purchase requests" 
ON public.premium_purchase_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add points_per_minute column to premium_memberships to track tier
ALTER TABLE public.premium_memberships 
ADD COLUMN IF NOT EXISTS points_per_minute numeric NOT NULL DEFAULT 0.01;

-- Add trigger for updated_at
CREATE TRIGGER update_premium_purchase_requests_updated_at
BEFORE UPDATE ON public.premium_purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();