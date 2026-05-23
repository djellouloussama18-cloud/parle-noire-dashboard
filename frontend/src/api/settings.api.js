// REQUIRED: Create a public bucket called "store-assets" in Supabase Storage
// Go to: Supabase Dashboard → Storage → New Bucket → Name: "store-assets" → Public: ON

import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

export const uploadLogoApi = async (file) => {
  if (!navigator.onLine) throw new Error('يجب توفر اتصال بالإنترنت لرفع الشعار');
  if (!file) throw new Error('لم يتم اختيار ملف');
  if (file.size > 2 * 1024 * 1024) throw new Error('حجم الملف يتجاوز 2 ميغابايت');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. استخدم PNG أو JPG');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `store-logo-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('store-assets')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from('store-assets')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

export const updateSettingApi = async (key, value) => {
  if (!navigator.onLine) {
    const data = { key, value: String(value) };
    await addToQueue({ type: 'updateSetting', payload: data });
    await offlineDB.put('settings', data);
    return true;
  }
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
  return true;
};
