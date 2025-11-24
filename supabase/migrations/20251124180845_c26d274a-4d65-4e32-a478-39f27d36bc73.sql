-- Add game_id and server_id fields to orders table for MLBB purchases
ALTER TABLE public.orders
ADD COLUMN game_id text,
ADD COLUMN server_id text,
ADD COLUMN game_name text;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.game_id IS 'Mobile Legends Game ID for diamond top-ups';
COMMENT ON COLUMN public.orders.server_id IS 'Mobile Legends Server ID for diamond top-ups';
COMMENT ON COLUMN public.orders.game_name IS 'Verified game name from Mobile Legends API';