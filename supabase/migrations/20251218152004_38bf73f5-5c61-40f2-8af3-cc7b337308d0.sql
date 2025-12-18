-- Create friend_requests table for friend system
CREATE TABLE public.friend_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own friend requests (sent or received)
CREATE POLICY "Users can view own friend requests"
ON public.friend_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update friend requests they received (accept/reject)
CREATE POLICY "Users can update received requests"
ON public.friend_requests FOR UPDATE
USING (auth.uid() = receiver_id);

-- Users can delete their own sent requests
CREATE POLICY "Users can delete own sent requests"
ON public.friend_requests FOR DELETE
USING (auth.uid() = sender_id);

-- Add read_at column to messages for unread tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;