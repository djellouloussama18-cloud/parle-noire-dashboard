import api from './axios.config';

export const askAiApi = async (message) => {
  const response = await api.post('/ai/chat', { message });
  return response.data;
};

export const getAnalysisApi = async () => {
  const response = await api.get('/ai/analysis');
  return response.data;
};
