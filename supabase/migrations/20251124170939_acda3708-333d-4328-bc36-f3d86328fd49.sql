-- Drop existing foreign key constraint from point_withdrawals
ALTER TABLE point_withdrawals DROP CONSTRAINT IF EXISTS point_withdrawals_withdrawal_item_id_fkey;

-- Create new withdrawal_items table with integer ID
CREATE TABLE withdrawal_items_new (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  value_amount NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create mapping table for old UUID to new integer ID
CREATE TEMPORARY TABLE withdrawal_item_id_mapping (
  old_id UUID,
  new_id INTEGER
);

-- Migrate data from old withdrawal_items table to new table
DO $$
DECLARE
  item_record RECORD;
  new_item_id INTEGER;
BEGIN
  FOR item_record IN SELECT * FROM withdrawal_items ORDER BY created_at LOOP
    INSERT INTO withdrawal_items_new (
      name, 
      description, 
      points_required, 
      value_amount, 
      image_url, 
      is_active, 
      created_at, 
      updated_at
    )
    VALUES (
      item_record.name,
      item_record.description,
      item_record.points_required,
      item_record.value_amount,
      item_record.image_url,
      item_record.is_active,
      item_record.created_at,
      item_record.updated_at
    )
    RETURNING id INTO new_item_id;
    
    INSERT INTO withdrawal_item_id_mapping (old_id, new_id)
    VALUES (item_record.id, new_item_id);
  END LOOP;
END $$;

-- Create new point_withdrawals table with integer withdrawal_item_id
CREATE TABLE point_withdrawals_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points_withdrawn INTEGER NOT NULL,
  withdrawal_item_id INTEGER REFERENCES withdrawal_items_new(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate point_withdrawals data
INSERT INTO point_withdrawals_new (id, user_id, points_withdrawn, withdrawal_item_id, status, created_at)
SELECT 
  pw.id,
  pw.user_id,
  pw.points_withdrawn,
  wim.new_id,
  pw.status,
  pw.created_at
FROM point_withdrawals pw
LEFT JOIN withdrawal_item_id_mapping wim ON pw.withdrawal_item_id = wim.old_id;

-- Drop old tables
DROP TABLE point_withdrawals;
DROP TABLE withdrawal_items;

-- Rename new tables
ALTER TABLE withdrawal_items_new RENAME TO withdrawal_items;
ALTER TABLE point_withdrawals_new RENAME TO point_withdrawals;

-- Enable RLS
ALTER TABLE withdrawal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_withdrawals ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for withdrawal_items
CREATE POLICY "Anyone can view active withdrawal items" ON withdrawal_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can insert withdrawal items" ON withdrawal_items
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawal items" ON withdrawal_items
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete withdrawal items" ON withdrawal_items
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Recreate RLS policies for point_withdrawals
CREATE POLICY "Users can view own withdrawals" ON point_withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals" ON point_withdrawals
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create withdrawals" ON point_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update withdrawals" ON point_withdrawals
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));