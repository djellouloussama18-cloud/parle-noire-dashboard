import api from './axios.config';

export const getSalesApi = async () => {
  const response = await api.get('/sales');
  return response.data;
};

export const createSaleApi = async (saleData) => {
  const response = await api.post('/sales', saleData);
  return response.data;
};
