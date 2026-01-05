-- Create storage bucket for operator logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('operator-logos', 'operator-logos', true);

-- Allow anyone to view operator logos (public bucket)
CREATE POLICY "Anyone can view operator logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'operator-logos');

-- Allow admins to upload operator logos
CREATE POLICY "Admins can upload operator logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'operator-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update operator logos
CREATE POLICY "Admins can update operator logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'operator-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete operator logos
CREATE POLICY "Admins can delete operator logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'operator-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);