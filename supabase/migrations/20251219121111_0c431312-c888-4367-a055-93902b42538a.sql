-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can upload to own folder in chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder in chat-voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat-voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in chat-voices" ON storage.objects;

-- Policies for chat-images bucket (public)
CREATE POLICY "Users can upload to own folder in chat-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can read chat-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete own files in chat-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policies for chat-voices bucket (private)
CREATE POLICY "Users can upload to own folder in chat-voices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-voices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can read chat-voices"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-voices');

CREATE POLICY "Users can delete own files in chat-voices"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-voices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);