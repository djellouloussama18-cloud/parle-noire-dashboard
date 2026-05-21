import { supabase } from '../lib/supabase';

export const loginApi = async (login, password) => {
  let email = login;

  // If login is a username (no @), find the email from profiles
  if (!login.includes('@')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', login)
      .single();

    if (profileError || !profile) {
      throw new Error('اسم المستخدم غير موجود');
    }

    // Get the email from auth.users via the profile id
    const { data: { user }, error: userError } = await supabase.auth.admin?.getUserById?.(profile.id) || {};
    
    // Since we can't use admin API on client, get email from profiles if stored
    // Alternative: store email in profiles table
    throw new Error('الرجاء استخدام البريد الإلكتروني لتسجيل الدخول');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

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
      .update({ username, full_name, phone, email })
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

