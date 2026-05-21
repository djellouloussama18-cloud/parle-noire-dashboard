const nodemailer = require('nodemailer');

// Build transporter lazily so env vars are loaded
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
}

const purposeConfig = {
  register: {
    title: 'تفعيل حسابك في نظام PARLE NOIRE',
    subtitle: 'رمز التحقق لتسجيل حساب جديد',
    action: 'لتفعيل حسابك'
  },
  reset: {
    title: 'إعادة تعيين كلمة المرور — PARLE NOIRE',
    subtitle: 'رمز التحقق لإعادة تعيين كلمة المرور',
    action: 'لإعادة تعيين كلمة المرور الخاصة بك'
  },
  change: {
    title: 'تغيير كلمة المرور — PARLE NOIRE',
    subtitle: 'رمز التحقق لتغيير كلمة المرور',
    action: 'لتأكيد تغيير كلمة المرور الخاصة بك'
  }
};

function buildHTML({ otp, fullName, purpose = 'register' }) {
  const cfg = purposeConfig[purpose] || purposeConfig.register;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Tahoma,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:30px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:48px;height:48px;background:rgba(0,255,127,0.1);border:1px solid rgba(0,255,127,0.3);border-radius:16px;text-align:center;vertical-align:middle;">
                    <span style="font-size:24px;">🛍️</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border-radius:24px;padding:40px 36px;border:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Badge -->
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <span style="display:inline-block;padding:6px 16px;background:rgba(0,255,127,0.1);border:1px solid rgba(0,255,127,0.2);border-radius:50px;color:#00FF7F;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                      PARLE NOIRE POS
                    </span>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.4;">
                      ${cfg.subtitle}
                    </h1>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.7;">
                      ${fullName ? `مرحباً ${fullName}،` : 'مرحباً بك،'}
                      <br />
                      أدخل الرمز التالي ${cfg.action}:
                    </p>
                  </td>
                </tr>

                <!-- OTP Code -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        ${otp.split('').map(d => `
                        <td style="width:56px;height:64px;background:#1a1a1e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;text-align:center;vertical-align:middle;${otp.indexOf(d) < otp.length - 1 ? 'padding-left:8px;' : ''}">
                          <span style="color:#00FF7F;font-size:30px;font-weight:900;letter-spacing:2px;font-family:monospace;">${d}</span>
                        </td>
                        `).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Expiry -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;">
                      ⏳ هذا الرمز صالح لمدة <strong style="color:#a1a1aa;">15 دقيقة</strong> فقط.
                      <br />
                      إذا لم تكن قد قمت بهذه العملية، يرجى تجاهل هذه الرسالة.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center">
                    <p style="margin:0;color:#3f3f46;font-size:11px;line-height:1.6;">
                      &copy; 2026 <strong style="color:#52525b;">Parle Noire</strong> — نظام إدارة المبيعات والمخزون الذكي
                      <br />
                      هذه الرسالة مرسلة تلقائياً، يرجى عدم الرد عليها.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer spacer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;color:#27272a;font-size:10px;">
                PARLE NOIRE &bull; Smart POS &bull; Algiers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const mailer = {
  sendOTP: async ({ email, otp, fullName, purpose = 'register' }) => {
    const cfg = purposeConfig[purpose] || purposeConfig.register;

    // 1. Always log to console (dev fallback)
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║              📧  EMAIL NOTIFICATION              ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  To:      ${(email || '').padEnd(36)}║`);
    console.log(`║  Subject: ${(cfg.title || '').padEnd(36)}║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  OTP:     ${otp.padEnd(36)}║`);
    console.log(`║  Purpose: ${(purpose || '').padEnd(36)}║`);
    console.log(`║  User:    ${(fullName || '—').padEnd(36)}║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // 2. Try sending via SMTP if configured
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass || pass.length < 8) {
      console.log('⚠️  SMTP not configured (SMTP_USER or SMTP_PASS missing). Email NOT sent.');
      console.log('   Set SMTP_USER and SMTP_PASS in .env to enable real email delivery.');
      return false;
    }

    let transporter;
    try {
      transporter = createTransporter();
      await transporter.verify();
    } catch (verifyErr) {
      console.error('❌ SMTP connection verification failed:', verifyErr.message);
      console.log('   ⚠️  Falling back to console log only.');
      return false;
    }

    const html = buildHTML({ otp, fullName, purpose });
    const mailFrom = process.env.MAIL_FROM || '"Parle Noire POS" <noreply@parlenoire.store>';

    try {
      const info = await transporter.sendMail({
        from: mailFrom,
        to: email,
        subject: cfg.title,
        html
      });
      console.log(`✅  Email sent successfully to ${email} (id: ${info.messageId})`);
      return true;
    } catch (sendErr) {
      console.error('❌ Failed to send email:', sendErr.message);
      if (sendErr.code === 'EAUTH') {
        console.error('   🔑 Authentication failed. Check SMTP_USER and SMTP_PASS in .env');
        console.error('   📖 For Gmail App Passwords: https://myaccount.google.com/apppasswords');
      } else if (sendErr.code === 'ESOCKET') {
        console.error('   🌐 Connection refused. Check SMTP_HOST and SMTP_PORT.');
      }
      return false;
    }
  }
};

module.exports = mailer;
