-- Add status + admin manageability for gift links so download is locked until admin approval
ALTER TABLE public.ai_gift_links
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Replace the broad public SELECT with a gated one (approved-only for public; owners + admins always)
DROP POLICY IF EXISTS "Anyone can view gift link by slug" ON public.ai_gift_links;

CREATE POLICY "Public can view approved gift links"
  ON public.ai_gift_links
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Owners can view own gift links"
  ON public.ai_gift_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to update gift link approval status
CREATE POLICY "Admins update gift links"
  ON public.ai_gift_links
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));