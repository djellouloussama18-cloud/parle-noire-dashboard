-- ==========================================
-- Reset All Data — Start Fresh
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Delete data in FK-safe order (children first)
DELETE FROM public.sale_items;
DELETE FROM public.notes;
DELETE FROM public.sales;
DELETE FROM public.products;
DELETE FROM public.customers;
DELETE FROM public.categories;
DELETE FROM public.settings;

-- Keep profiles — they link to auth.users and you
-- still need your login account. Delete only if
-- you also want to remove all auth users manually.
-- DELETE FROM public.profiles;

-- ==========================================
-- 2. Reset auto-increment (identity) sequences
-- ==========================================
ALTER TABLE public.sale_items   ALTER COLUMN id RESTART;
ALTER TABLE public.notes        ALTER COLUMN id RESTART;
ALTER TABLE public.sales        ALTER COLUMN id RESTART;
ALTER TABLE public.products     ALTER COLUMN id RESTART;
ALTER TABLE public.customers    ALTER COLUMN id RESTART;
ALTER TABLE public.categories    ALTER COLUMN id RESTART;
ALTER TABLE public.settings     ALTER COLUMN id RESTART;

-- ==========================================
-- 3. Re-insert seed defaults so the app
--    still works (categories & settings)
-- ==========================================
INSERT INTO public.categories (name_ar, name_en, color, icon) VALUES
('ملابس',     'Clothes',      '#00FF7F', 'Shirt'),
('إكسسوارات', 'Accessories',  '#00CC66', 'ShoppingBag'),
('عطور',      'Perfumes',     '#1DB954', 'Sparkles');

INSERT INTO public.settings (key, value) VALUES
('store_name',    'متجر الأناقة'),
('store_address', 'الجزائر العاصمة'),
('store_phone',   '0555123456'),
('currency',      'د.ج'),
('tva_rate',      '19');

SELECT '✅ All data reset successfully!' AS result;
