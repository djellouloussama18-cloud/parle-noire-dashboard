import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

export const getNotesApi = async (params = {}) => {
  if (!navigator.onLine) {
    let data = await offlineDB.getAll('notes');
    if (params.unreadOnly) {
      data = data.filter(n => !n.read);
    }
    return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  if (params.unreadOnly) {
    query = query.eq('read', false);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const createNoteApi = async (noteData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...noteData, id: tempId, created_at: new Date().toISOString(), read: false };
    await addToQueue({ type: 'createNote', payload: data });
    await offlineDB.put('notes', data);
    return data;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('notes').insert({ ...noteData, created_by: user?.id }).select().single();
  if (error) throw new Error(error.message);
  await offlineDB.put('notes', data);
  return data;
};

export const updateNoteApi = async (id, noteData) => {
  if (!navigator.onLine) {
    const data = { ...noteData, id };
    await addToQueue({ type: 'updateNote', payload: data });
    await offlineDB.put('notes', data);
    return data;
  }
  const { data, error } = await supabase.from('notes').update(noteData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await offlineDB.put('notes', data);
  return data;
};

export const deleteNoteApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteNote', payload: { id } });
    await offlineDB.remove('notes', id);
    return { success: true };
  }
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await offlineDB.remove('notes', id);
  return { success: true };
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
  const { data, error } = await supabase.from('notes').update({ read: true }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await offlineDB.put('notes', data);
  return data;
};

export const getUnreadCountApi = async () => {
  if (!navigator.onLine) {
    const data = await offlineDB.getAll('notes');
    const count = data.filter(n => !n.read).length;
    return { count };
  }
  const { count, error } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('read', false);
  if (error) throw new Error(error.message);
  return { count: count || 0 };
};
