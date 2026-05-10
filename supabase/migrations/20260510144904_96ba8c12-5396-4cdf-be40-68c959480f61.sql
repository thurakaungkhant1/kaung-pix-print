ALTER TABLE public.ai_gift_links ALTER COLUMN status SET DEFAULT 'approved';
UPDATE public.ai_gift_links SET status = 'approved' WHERE status = 'pending';