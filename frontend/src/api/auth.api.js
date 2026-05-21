import { supabase } from '../lib/supabase';

export const loginApi = async (login, password) => {
  // Supposing 'login' could be email or username. Supabase auth uses email by default.
  // For username login, we would need a custom edge function or query profile first.
  // Let's assume login is email for Supabase.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: login,
    password: password,
  });
  
  if (error) throw new Error(error.message);
  
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) throw new Error(profileError.message);
  
  return {
    token: data.session.access_token,
    user: { ...data.user, ...profile }
  };
};

export const logoutApi = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  return { success: true };
};

export const getMeApi = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error(authError?.message || 'User not found');
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError) throw new Error(profileError.message);
  
  return { ...user, ...profile };
};

export const registerApi = async (userData) => {
  const { email, password, username, full_name, phone } = userData;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw new Error(error.message);
  
  // Insert profile is handled by DB triggers, or we can update it here
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username, full_name, phone })
      .eq('id', data.user.id);
      
    if (profileError) console.error("Profile update failed:", profileError);
  }
  
  return { user: data.user };
};

export const forgotPasswordApi = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const resetPasswordApi = async (email, otp, newPassword) => {
  // Supabase uses verifyOtp or updates user after click
  // Assuming user is authenticated via magic link or recovery token
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const changePasswordApi = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return { success: true };
};

export const verifyOTPApi = async (email, otp) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });
  if (error) throw new Error(error.message);
  return data;
};

export const sendChangePasswordOTPApi = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) throw new Error(userError?.message || 'User not found');
  const { error } = await supabase.auth.signInWithOtp({ email: user.email });
  if (error) throw new Error(error.message);
  return { success: true };
};

