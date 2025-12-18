-- Add account_status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'good';

-- Create reports table for user/message reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'account', -- 'account' or 'message'
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'dismissed', 'actioned'
  admin_action TEXT, -- 'dismissed', 'warning', 'temporary_ban'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view own submitted reports"
ON public.reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update reports (for moderation)
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any profile's account_status
CREATE POLICY "Admins can update account status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));