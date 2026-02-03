-- Enable realtime for products table to get instant stock updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;