import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
}

export const getNotesApi = async (params = {}) => {
  if (!navigator.onLine) {
    let data = await offlineDB.getAll('notes');
    if (params.unreadOnly) {
      data = data.filter(n => !n.read);
    }
    return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  try {
    const url = params.unreadOnly
      ? `${API_BASE}/api/notes?unreadOnly=true`
      : `${API_BASE}/api/notes`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch notes'}`);
    }

    const data = await response.json();
    for (const note of data) {
      await offlineDB.put('notes', note);
    }
    return data;
  } catch (error) {
    console.error('getNotes error:', error);
    throw error;
  }
};

export const createNoteApi = async (noteData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...noteData, id: tempId, created_at: new Date().toISOString(), read: false };
    await addToQueue({ type: 'createNote', payload: data });
    await offlineDB.put('notes', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('notes', result.data);
    return result;
  } catch (error) {
    console.error('createNote error:', error);
    throw error;
  }
};

export const updateNoteApi = async (id, noteData) => {
  if (!navigator.onLine) {
    const data = { ...noteData, id: parseInt(id, 10) };
    await addToQueue({ type: 'updateNote', payload: data });
    await offlineDB.put('notes', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('notes', result.data);
    return result;
  } catch (error) {
    console.error('updateNote error:', error);
    throw error;
  }
};

export const deleteNoteApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteNote', payload: { id } });
    await offlineDB.remove('notes', parseInt(id, 10));
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.remove('notes', parseInt(id, 10));
    return result;
  } catch (error) {
    console.error('deleteNote error:', error);
    throw error;
  }
};

export const markNoteAsReadApi = async (id) => {
  if (!navigator.onLine) {
    const note = await offlineDB.getById('notes', id);
    if (note) {
      const updated = { ...note, read: true };
      await addToQueue({ type: 'updateNote', payload: updated });
      await offlineDB.put('notes', updated);
      return updated;
    }
    return { id, read: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeadersJson(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('notes', result.data);
    return result;
  } catch (error) {
    console.error('markNoteAsRead error:', error);
    throw error;
  }
};

export const getUnreadCountApi = async () => {
  if (!navigator.onLine) {
    const data = await offlineDB.getAll('notes');
    const count = data.filter(n => !n.read).length;
    return { count };
  }

  try {
    const response = await fetch(`${API_BASE}/api/notes/unread-count`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to get unread count'}`);
    }

    return response.json();
  } catch (error) {
    console.error('getUnreadCount error:', error);
    throw error;
  }
};
