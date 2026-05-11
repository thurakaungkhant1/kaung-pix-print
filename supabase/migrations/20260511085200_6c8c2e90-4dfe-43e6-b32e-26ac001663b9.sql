
-- Make ai-uploads and ai-photos storage policies robust
DROP POLICY IF EXISTS "ai-uploads owner insert" ON storage.objects;
DROP POLICY IF EXISTS "ai-uploads owner read" ON storage.objects;
DROP POLICY IF EXISTS "ai-uploads owner update" ON storage.objects;
DROP POLICY IF EXISTS "ai-uploads owner delete" ON storage.objects;
DROP POLICY IF EXISTS "ai-photos auth insert" ON storage.objects;
DROP POLICY IF EXISTS "ai-photos public read" ON storage.objects;

CREATE POLICY "ai-uploads owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ai-uploads owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ai-uploads owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ai-uploads owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ai-photos auth insert" ON storage.objects
  FOR INSERT TO authenticated, service_role
  WITH CHECK (bucket_id = 'ai-photos');

CREATE POLICY "ai-photos public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ai-photos');
