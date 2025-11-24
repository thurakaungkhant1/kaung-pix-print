-- Drop existing foreign key constraint from favourite_photos
ALTER TABLE favourite_photos DROP CONSTRAINT IF EXISTS favourite_photos_photo_id_fkey;

-- Create new photos table with integer ID
CREATE TABLE photos_new (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  preview_image TEXT,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create mapping table for old UUID to new integer ID
CREATE TEMPORARY TABLE photo_id_mapping (
  old_id UUID,
  new_id INTEGER
);

-- Migrate data from old photos table to new table
DO $$
DECLARE
  photo_record RECORD;
  new_photo_id INTEGER;
BEGIN
  FOR photo_record IN SELECT * FROM photos ORDER BY created_at LOOP
    INSERT INTO photos_new (client_name, file_url, file_size, preview_image, category, created_at)
    VALUES (
      photo_record.client_name,
      photo_record.file_url,
      photo_record.file_size,
      photo_record.preview_image,
      photo_record.category,
      photo_record.created_at
    )
    RETURNING id INTO new_photo_id;
    
    INSERT INTO photo_id_mapping (old_id, new_id)
    VALUES (photo_record.id, new_photo_id);
  END LOOP;
END $$;

-- Create new favourite_photos table with integer photo_id
CREATE TABLE favourite_photos_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photo_id INTEGER NOT NULL REFERENCES photos_new(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate favourite_photos data
INSERT INTO favourite_photos_new (id, user_id, photo_id, created_at)
SELECT 
  fp.id,
  fp.user_id,
  pim.new_id,
  fp.created_at
FROM favourite_photos fp
INNER JOIN photo_id_mapping pim ON fp.photo_id = pim.old_id;

-- Drop old tables
DROP TABLE favourite_photos;
DROP TABLE photos;

-- Rename new tables
ALTER TABLE photos_new RENAME TO photos;
ALTER TABLE favourite_photos_new RENAME TO favourite_photos;

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourite_photos ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for photos
CREATE POLICY "Anyone can view photos" ON photos
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert photos" ON photos
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update photos" ON photos
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete photos" ON photos
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Recreate RLS policies for favourite_photos
CREATE POLICY "Users can view their own photo favourites" ON favourite_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own photo favourites" ON favourite_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own photo favourites" ON favourite_photos
  FOR DELETE USING (auth.uid() = user_id);