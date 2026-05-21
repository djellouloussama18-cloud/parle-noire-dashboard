import api from './axios.config';

export const getNotesApi = async (params = {}) => {
  const response = await api.get('/notes', { params });
  return response.data;
};

export const createNoteApi = async (noteData) => {
  const response = await api.post('/notes', noteData);
  return response.data;
};

export const updateNoteApi = async (id, noteData) => {
  const response = await api.put(`/notes/${id}`, noteData);
  return response.data;
};

export const deleteNoteApi = async (id) => {
  const response = await api.delete(`/notes/${id}`);
  return response.data;
};

export const markNoteAsReadApi = async (id) => {
  const response = await api.put(`/notes/${id}/read`);
  return response.data;
};

export const getUnreadCountApi = async () => {
  const response = await api.get('/notes/unread-count');
  return response.data;
};
