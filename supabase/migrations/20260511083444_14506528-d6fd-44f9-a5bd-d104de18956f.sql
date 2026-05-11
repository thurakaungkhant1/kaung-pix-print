
-- Restrict product_reviews SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.product_reviews;
CREATE POLICY "Authenticated users can view reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (true);

-- Tighten chat-media INSERT to scope uploads to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
