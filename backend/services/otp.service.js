const crypto = require('crypto');

// In-memory OTP store: key (email or userId) -> { otp, expiresAt, purpose, ...data }
const otpStore = new Map();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
      console.log(`🧹 Expired OTP cleaned for: ${email}`);
    }
  }
}, 5 * 60 * 1000);

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function storeOTP(email, userData) {
  const otp = generateOTP();
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    ...userData
  });
  return otp;
}

function verifyOTP(key, otp, expectedPurpose = null) {
  const record = otpStore.get(key);
  if (!record) {
    return { valid: false, message: 'لم يتم طلب رمز تحقق لهذا البريد الإلكتروني' };
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, message: 'انتهت صلاحية رمز التحقق. يرجى إعادة المحاولة' };
  }
  if (record.otp !== otp) {
    return { valid: false, message: 'رمز التحقق غير صحيح' };
  }
  if (expectedPurpose && record.purpose !== expectedPurpose) {
    otpStore.delete(key);
    return { valid: false, message: 'رمز التحقق غير صالح لهذه العملية' };
  }
  // Valid OTP — return stored data and remove it
  const userData = { ...record };
  otpStore.delete(key);
  return { valid: true, userData };
}

function getStoredOTPData(email) {
  return otpStore.get(email) || null;
}

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  getStoredOTPData
};
