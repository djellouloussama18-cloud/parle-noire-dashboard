const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otp.service');
const mailer = require('../services/mailer.service');

exports.login = (req, res, next) => {
  try {
    const { login, password } = req.body; // login can be username or email
    if (!login || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    // Query user by username or email
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً' });
    }

    // Compare passwords
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة. يرجى المحاولة مجدداً' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Update last login
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        last_login: user.last_login
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المستخدم غير موجود' });
    }
    return res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'يرجى إدخال كلمة المرور القديمة والجديدة' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المستخدم غير موجود' });
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'BAD_PASSWORD', message: 'كلمة المرور القديمة غير صحيحة' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id);

    return res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'الاسم الكامل، البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Generate a username from the email prefix
    const username = email.split('@')[0];

    // Generate OTP and store temporarily
    const otp = otpService.storeOTP(email, {
      purpose: 'register',
      fullName,
      phone: phone || null,
      passwordHash,
      username
    });

    // Send OTP via email
    await mailer.sendOTP({ email, otp, fullName, purpose: 'register' });

    return res.status(201).json({
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.',
      email
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyOTP = (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
    }

    const result = otpService.verifyOTP(email, otp, 'register');
    if (!result.valid) {
      return res.status(400).json({ error: 'INVALID_OTP', message: result.message });
    }

    const { fullName, phone, passwordHash, username } = result.userData;

    // Create the user in database as active staff
    db.prepare('INSERT INTO users (username, email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?, ?)')
      .run(username, email, passwordHash, 'active', fullName, phone);

    return res.status(201).json({
      message: 'تم تفعيل الحساب بنجاح! يمكنك الآن تسجيل الدخول.'
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'البريد الإلكتروني مطلوب' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني' });
    }

    const otp = otpService.storeOTP(email, { purpose: 'reset' });

    await mailer.sendOTP({ email, otp, fullName: user.full_name, purpose: 'reset' });

    return res.json({ message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', email });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'البريد الإلكتروني ورمز التحقق وكلمة المرور الجديدة مطلوبة' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const result = otpService.verifyOTP(email, otp, 'reset');
    if (!result.valid) {
      return res.status(400).json({ error: 'INVALID_OTP', message: result.message });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email);

    return res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' });
  } catch (err) {
    next(err);
  }
};

exports.sendChangePasswordOTP = async (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المستخدم غير موجود' });
    }

    const otp = otpService.storeOTP(user.email, { purpose: 'change', userId: user.id });

    await mailer.sendOTP({ email: user.email, otp, fullName: user.full_name, purpose: 'change' });

    return res.json({ message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = (req, res, next) => {
  try {
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'رمز التحقق وكلمة المرور الجديدة مطلوبان' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المستخدم غير موجود' });
    }

    const result = otpService.verifyOTP(user.email, otp, 'change');
    if (!result.valid) {
      return res.status(400).json({ error: 'INVALID_OTP', message: result.message });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

    return res.json({ message: 'تم تغيير كلمة المرور بنجاح!' });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  return res.json({ message: 'تم تسجيل الخروج بنجاح' });
};
