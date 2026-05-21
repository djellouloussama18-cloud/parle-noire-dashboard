import api from './axios.config';

export const getReportsSummaryApi = async () => {
  const response = await api.get('/reports/summary');
  return response.data;
};

export const getReportsChartsApi = async () => {
  const response = await api.get('/reports/charts');
  return response.data;
};

// Backups API
export const getBackupsApi = async () => {
  const response = await api.get('/backup');
  return response.data;
};

export const triggerBackupApi = async () => {
  const response = await api.post('/backup/now');
  return response.data;
};

export const downloadBackupApi = async (id) => {
  const response = await api.get(`/backup/${id}/download`, { responseType: 'blob' });
  return response;
};
