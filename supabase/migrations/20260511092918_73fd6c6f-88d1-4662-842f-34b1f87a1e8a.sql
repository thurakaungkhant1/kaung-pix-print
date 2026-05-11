UPDATE public.promotional_banners SET link_url = '/ai' WHERE link_url = '/physical-products';
ALTER TABLE public.promotional_banners ALTER COLUMN link_url SET DEFAULT '/ai';