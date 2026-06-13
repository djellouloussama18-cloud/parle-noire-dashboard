import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
}

export const uploadLogoApi = async (file) => {
  if (!file) throw new Error('لم يتم اختيار ملف');
  if (file.size > 2 * 1024 * 1024) throw new Error('حجم الملف يتجاوز 2 ميغابايت');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. استخدم PNG أو JPG');
  }

  try {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`${API_BASE}/api/settings/upload/logo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    return result;
  } catch (error) {
    console.error('uploadLogo error:', error);
    throw error;
  }
};

export const updateSettingApi = async (key, value) => {
  if (!navigator.onLine) {
    const data = { key, value: String(value) };
    await addToQueue({ type: 'updateSetting', payload: data });
    await offlineDB.put('settings', data);
    return true;
  }

  try {
    const response = await fetch(`${API_BASE}/api/settings/upsert`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ key, value: String(value) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('settings', { key, value: String(value) });
    return result;
  } catch (error) {
    console.error('updateSetting error:', error);
    throw error;
  }
};

export const downloadDocumentationApi = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/settings/documentation`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to download documentation'}`);
    }
    const data = await response.blob();
    return { data };
  } catch (error) {
    console.error('downloadDocumentation error:', error);
    throw error;
  }
};
