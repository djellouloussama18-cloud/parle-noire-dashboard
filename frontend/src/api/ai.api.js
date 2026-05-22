import { supabase } from '../lib/supabase';

export const askAiApi = async (message, history = [], lang = 'ar') => {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { message, history, lang }
  });

  if (error) throw new Error(error.message);
  return data;
};

export const getAnalysisApi = async (lang = 'ar') => {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { message: 'تحليل كامل', history: [], lang }
  });

  if (error) throw new Error(error.message);
  return data;
};
