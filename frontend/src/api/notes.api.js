import { supabase } from '../lib/supabase';

export const getNotesApi = async (params = {}) => {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  if (params.unreadOnly) {
    query = query.eq('read', false);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const createNoteApi = async (noteData) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('notes').insert({ ...noteData, created_by: user?.id }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateNoteApi = async (id, noteData) => {
  const { data, error } = await supabase.from('notes').update(noteData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteNoteApi = async (id) => {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
};

export const markNoteAsReadApi = async (id) => {
  const { data, error } = await supabase.from('notes').update({ read: true }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const getUnreadCountApi = async () => {
  const { count, error } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('read', false);
  if (error) throw new Error(error.message);
  return { count: count || 0 };
};
