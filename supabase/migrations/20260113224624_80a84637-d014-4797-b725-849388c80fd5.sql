-- Create storage bucket for background music
INSERT INTO storage.buckets (id, name, public)
VALUES ('background-music', 'background-music', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for background-music bucket
CREATE POLICY "Anyone can view background music"
ON storage.objects FOR SELECT
USING (bucket_id = 'background-music');

CREATE POLICY "Admins can upload background music"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'background-music' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update background music"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'background-music' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete background music"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'background-music' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create background_music table
CREATE TABLE public.background_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  page_location TEXT NOT NULL DEFAULT 'photo_gallery',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.background_music ENABLE ROW LEVEL SECURITY;

-- Public can view active music
CREATE POLICY "Anyone can view active background music"
ON public.background_music FOR SELECT
USING (is_active = true);

-- Admins can manage all music
CREATE POLICY "Admins can manage background music"
ON public.background_music FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_background_music_updated_at
BEFORE UPDATE ON public.background_music
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();