-- =====================================================
-- 1. أضف عمود license_key إلى جدول profiles (إذا لم يكن موجوداً)
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS license_key TEXT;

-- =====================================================
-- 2. اربط الحساب PN-2T7Q-7WVE-9BC4 ببروفايل المستخدم
--    (عدّل البريد الإلكتروني حسب حسابك الفعلي)
-- =====================================================
UPDATE public.profiles
SET license_key = 'PN-2T7Q-7WVE-9BC4'
WHERE license_key IS NULL
   OR license_key = '';

-- =====================================================
-- 3. تحقق من النتيجة
-- =====================================================
SELECT id, full_name, license_key
FROM public.profiles
ORDER BY created_at DESC;
