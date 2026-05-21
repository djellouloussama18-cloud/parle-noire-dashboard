// AI functionality requires a backend or Edge Function to keep the API key safe.
// Since we removed the Node backend, this is mocked for now.
export const askAiApi = async (message) => {
  return { reply: "ميزة الذكاء الاصطناعي تحتاج إلى إعداد Supabase Edge Functions لتجنب كشف مفتاح API." };
};

export const getAnalysisApi = async () => {
  return { analysis: "غير متوفر حالياً." };
};
