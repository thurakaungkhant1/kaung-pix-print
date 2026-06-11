
-- Add presence tracking column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Allow authenticated users to view other users' basic profiles (needed for friends/discovery)
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view basic profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Allow users to view blocks against them (so they can know they're blocked)
DROP POLICY IF EXISTS "Users can view blocks against them" ON public.blocked_users;
CREATE POLICY "Users can view blocks against them"
ON public.blocked_users FOR SELECT TO authenticated
USING (auth.uid() = blocked_id);

-- Realtime
ALTER TABLE public.friend_requests REPLICA IDENTITY FULL;
ALTER TABLE public.blocked_users REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
