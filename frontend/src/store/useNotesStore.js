import { create } from 'zustand';
import {
  getNotesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  markNoteAsReadApi,
  getUnreadCountApi
} from '../api/notes.api';

const useNotesStore = create((set, get) => ({
  notes: [],
  unreadCount: { total: 0, system: 0, merchant: 0 },
  isLoading: false,
  error: null,

  fetchNotes: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getNotesApi(params);
      set({ notes: data, isLoading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'فشل تحميل الملاحظات', isLoading: false });
      throw err;
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await getUnreadCountApi();
      set({ unreadCount: data });
      return data;
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  createNote: async (noteData) => {
    try {
      const newNote = await createNoteApi(noteData);
      set(state => ({
        notes: [newNote, ...state.notes],
        unreadCount: {
          ...state.unreadCount,
          total: state.unreadCount.total + 1,
          [newNote.type]: (state.unreadCount[newNote.type] || 0) + 1
        }
      }));
      return newNote;
    } catch (err) {
      throw err;
    }
  },

  updateNote: async (id, noteData) => {
    try {
      const updated = await updateNoteApi(id, noteData);
      set(state => ({
        notes: state.notes.map(n => n.id === id ? updated : n)
      }));
      return updated;
    } catch (err) {
      throw err;
    }
  },

  deleteNote: async (id) => {
    try {
      await deleteNoteApi(id);
      set(state => ({
        notes: state.notes.filter(n => n.id !== id)
      }));
    } catch (err) {
      throw err;
    }
  },

  markAsRead: async (id) => {
    try {
      await markNoteAsReadApi(id);
      set(state => {
        const note = state.notes.find(n => n.id === id);
        const newCount = { ...state.unreadCount };
        if (note && !note.read) {
          newCount.total = Math.max(0, newCount.total - 1);
          newCount[note.type] = Math.max(0, (newCount[note.type] || 0) - 1);
        }
        return {
          notes: state.notes.map(n => n.id === id ? { ...n, read: true } : n),
          unreadCount: newCount
        };
      });
    } catch (err) {
      throw err;
    }
  },

  getSystemNotes: () => get().notes.filter(n => n.type === 'system'),
  getMerchantNotes: () => get().notes.filter(n => n.type === 'merchant'),
  getUnreadNotes: () => get().notes.filter(n => !n.read),
}));

export default useNotesStore;
