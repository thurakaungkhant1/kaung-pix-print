-- Step 1: Create new products table with integer ID
CREATE TABLE public.products_new (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Copy data from old products to new (with auto-generated sequential IDs)
INSERT INTO products_new (name, description, price, image_url, points_value, created_at)
SELECT name, description, price, image_url, points_value, created_at
FROM products
ORDER BY created_at ASC;

-- Step 3: Create mapping table to track UUID -> integer ID conversion
CREATE TABLE public.product_id_mapping (
  old_uuid UUID NOT NULL,
  new_id INTEGER NOT NULL
);

-- Step 4: Populate mapping table
INSERT INTO product_id_mapping (old_uuid, new_id)
SELECT p.id, pn.id
FROM products p
JOIN products_new pn ON p.name = pn.name AND p.price = pn.price AND p.created_at = pn.created_at;

-- Step 5: Create new orders table with integer product_id
CREATE TABLE public.orders_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products_new(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  phone_number TEXT NOT NULL DEFAULT ''::text,
  delivery_address TEXT NOT NULL DEFAULT ''::text,
  payment_method TEXT NOT NULL DEFAULT 'cod'::text,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 6: Copy orders with converted product IDs
INSERT INTO orders_new (id, user_id, product_id, quantity, price, phone_number, delivery_address, payment_method, payment_proof_url, status, created_at)
SELECT o.id, o.user_id, m.new_id, o.quantity, o.price, o.phone_number, o.delivery_address, o.payment_method, o.payment_proof_url, o.status, o.created_at
FROM orders o
JOIN product_id_mapping m ON o.product_id = m.old_uuid;

-- Step 7: Create new favourite_products table with integer product_id
CREATE TABLE public.favourite_products_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products_new(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 8: Copy favourites with converted product IDs
INSERT INTO favourite_products_new (id, user_id, product_id, created_at)
SELECT f.id, f.user_id, m.new_id, f.created_at
FROM favourite_products f
JOIN product_id_mapping m ON f.product_id = m.old_uuid;

-- Step 9: Drop old tables and triggers
DROP TRIGGER IF EXISTS award_points_on_order_update ON orders;
DROP TABLE orders CASCADE;
DROP TABLE favourite_products CASCADE;
DROP TABLE products CASCADE;

-- Step 10: Rename new tables
ALTER TABLE products_new RENAME TO products;
ALTER TABLE orders_new RENAME TO orders;
ALTER TABLE favourite_products_new RENAME TO favourite_products;

-- Step 11: Recreate RLS policies for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 12: Recreate RLS policies for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 13: Recreate RLS policies for favourite_products
ALTER TABLE favourite_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favourites"
  ON favourite_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favourites"
  ON favourite_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favourites"
  ON favourite_products FOR DELETE
  USING (auth.uid() = user_id);

-- Step 14: Recreate trigger for point awards
CREATE TRIGGER award_points_on_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_points_on_order_finish();

-- Step 15: Clean up mapping table
DROP TABLE product_id_mapping;