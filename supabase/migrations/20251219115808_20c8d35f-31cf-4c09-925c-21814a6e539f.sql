-- Create chat-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create chat-voices bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-voices', 'chat-voices', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS Policies for chat-images bucket

-- Anyone can read chat-images (public bucket)
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Users can upload to their own folder in chat-images
CREATE POLICY "Users can upload chat images to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files in chat-images
CREATE POLICY "Users can update own chat images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files in chat-images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for chat-voices bucket

-- Only authenticated users can read chat-voices
CREATE POLICY "Authenticated users can view chat voices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-voices' 
  AND auth.role() = 'authenticated'
);

-- Users can upload to their own folder in chat-voices
CREATE POLICY "Users can upload chat voices to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files in chat-voices
CREATE POLICY "Users can update own chat voices"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files in chat-voices
CREATE POLICY "Users can delete own chat voices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);