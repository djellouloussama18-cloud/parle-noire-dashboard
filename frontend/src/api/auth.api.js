import { API_BASE } from './config';

export const loginApi = async () => {};
export const logoutApi = async () => ({ success: true });
export const getMeApi = async () => ({ user: { id: 'default', full_name: 'Merchant Owner', email: 'merchant@local', role: 'admin' } });
export const registerApi = async () => ({ success: true });
export const forgotPasswordApi = async () => ({ success: true });
export const resetPasswordApi = async () => ({ success: true });
export const changePasswordApi = async () => ({ success: true, message: 'Password changed successfully' });
export const verifyOTPApi = async () => ({ success: true });
export const sendChangePasswordOTPApi = async () => ({ success: true });
