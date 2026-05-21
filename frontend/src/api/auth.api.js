import api from './axios.config';

export const loginApi = async (login, password) => {
  const response = await api.post('/auth/login', { login, password });
  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePasswordApi = async (otp, newPassword) => {
  const response = await api.post('/auth/change-password', { otp, newPassword });
  return response.data;
};

export const registerApi = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const verifyOTPApi = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordApi = async (email, otp, newPassword) => {
  const response = await api.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};

export const sendChangePasswordOTPApi = async () => {
  const response = await api.post('/auth/send-change-otp');
  return response.data;
};
