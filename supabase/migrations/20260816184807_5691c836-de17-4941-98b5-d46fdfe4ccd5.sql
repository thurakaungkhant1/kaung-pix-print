DROP POLICY IF EXISTS "Anyone can log ad events" ON public.ad_events;
CREATE POLICY "Log own ad events" ON public.ad_events
FOR INSERT TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());