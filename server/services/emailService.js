import 'dotenv/config';
import nodemailer from 'nodemailer';

// In-memory registry for test runner verification only (never exposed via API or logs)
let _lastTestOtpStore = {};

export const _getLastTestOtp = (email) => {
  if (!email) return null;
  return _lastTestOtpStore[email.toLowerCase().trim()] || null;
};

export const _clearTestOtp = (email) => {
  if (email) {
    delete _lastTestOtpStore[email.toLowerCase().trim()];
  } else {
    _lastTestOtpStore = {};
  }
};

/**
 * Creates and returns configured Nodemailer transporter with normalized credentials
 */
export const createTransporter = () => {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASSWORD;
  // Safely normalize Google App Password: strip internal spaces and surrounding whitespace
  const pass = rawPass ? rawPass.replace(/\s+/g, '').trim() : undefined;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user,
      pass
    }
  });
};

/**
 * Verifies SMTP connection safely without exposing sensitive credentials
 */
export const verifySmtpConnection = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('[SMTP] ⚠️  SMTP credentials not configured (SMTP_USER or SMTP_PASSWORD missing in .env)');
    return false;
  }

  try {
    await transporter.verify();
    console.log(`[SMTP] ✓ SMTP connection successful (Connected to ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'})`);
    return true;
  } catch (error) {
    console.error('[SMTP] ✗ SMTP connection failed:', {
      code: error.code || 'AUTH_FAILED',
      command: error.command || 'VERIFY',
      response: error.response || error.message
    });
    return false;
  }
};

/**
 * Branded NihongoHub HTML email template wrapper
 */
const renderEmailTemplate = ({ title, subtitle, otp, warningMessage }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfbf9; margin: 0; padding: 24px; color: #1a1918; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #eeece6; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .header { background: #faf9f6; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid #eeece6; }
    .logo-badge { display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: #d93829; color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 12px; }
    .brand-title { font-size: 20px; font-weight: 800; color: #1a1918; margin: 0; letter-spacing: -0.5px; }
    .brand-sub { color: #d93829; font-weight: 700; }
    .content { padding: 32px 28px; }
    .title { font-size: 18px; font-weight: 700; color: #1a1918; margin-top: 0; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #6e6b66; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #faf9f6; border: 2px dashed #d93829; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #d93829; font-family: 'Courier New', Courier, monospace; }
    .timer-note { font-size: 12px; color: #8c8880; margin-top: 8px; font-weight: 600; }
    .warning { font-size: 13px; color: #8c8880; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f2f0ea; padding-top: 20px; }
    .footer { background: #faf9f6; padding: 18px 24px; text-align: center; font-size: 12px; color: #a19d95; border-top: 1px solid #eeece6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">日</div>
      <h1 class="brand-title">日本語ハブ <span class="brand-sub">NihongoHub</span></h1>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="subtitle">${subtitle}</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="timer-note">⏱ Valid for 5 minutes only</div>
      </div>
      
      <div class="warning">
        ${warningMessage}
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} NihongoHub. Secure Japanese Vocabulary Mastery.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Sends Signup Verification OTP Email
 * @param {string} email 
 * @param {string} otp 
 */
export const sendSignupOTP = async (email, otp) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  _lastTestOtpStore[normalizedEmail] = otp;

  const transporter = createTransporter();
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@nihongohub.com').trim();

  const html = renderEmailTemplate({
    title: 'Verify Your NihongoHub Account',
    subtitle: 'Thank you for signing up with NihongoHub! Please use the 6-digit verification code below to complete your registration:',
    otp,
    warningMessage: 'This code will expire in <strong>5 minutes</strong>. If you did not create an account on NihongoHub, please disregard this email.'
  });

  if (!transporter) {
    if (process.env.NODE_ENV === 'test') {
      return { success: true, simulated: true };
    }
    console.error('[SMTP] ✗ Cannot send OTP email: SMTP transporter is not configured in .env');
    throw new Error('Unable to send OTP. Please try again.');
  }

  try {
    const info = await transporter.sendMail({
      from: `"NihongoHub" <${from}>`,
      to: normalizedEmail,
      subject: 'Verify Your NihongoHub Account',
      text: `Your NihongoHub verification code is: ${otp}. It expires in 5 minutes.`,
      html
    });
    console.log(`[SMTP] ✓ Signup OTP email sent successfully to: ${normalizedEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP] ✗ Signup OTP email sending failed:', {
      recipient: normalizedEmail,
      code: error.code || 'UNKNOWN',
      command: error.command || 'SENDMAIL',
      response: error.response || error.message
    });
    throw new Error('Unable to send OTP. Please try again.');
  }
};

/**
 * Sends Login Verification OTP Email
 * @param {string} email 
 * @param {string} otp 
 */
export const sendLoginOTP = async (email, otp) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  _lastTestOtpStore[normalizedEmail] = otp;

  const transporter = createTransporter();
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@nihongohub.com').trim();

  const html = renderEmailTemplate({
    title: 'Your NihongoHub Login OTP',
    subtitle: 'A login request was made for your NihongoHub account. Please enter the 6-digit code below to sign in:',
    otp,
    warningMessage: 'This code expires in <strong>5 minutes</strong>. <strong>Never share this code with anyone.</strong> If you did not initiate this login, your credentials may be compromised.'
  });

  if (!transporter) {
    if (process.env.NODE_ENV === 'test') {
      return { success: true, simulated: true };
    }
    console.error('[SMTP] ✗ Cannot send OTP email: SMTP transporter is not configured in .env');
    throw new Error('Unable to send OTP. Please try again.');
  }

  try {
    const info = await transporter.sendMail({
      from: `"NihongoHub" <${from}>`,
      to: normalizedEmail,
      subject: 'Your NihongoHub Login OTP',
      text: `Your NihongoHub login verification code is: ${otp}. It expires in 5 minutes.`,
      html
    });
    console.log(`[SMTP] ✓ Login OTP email sent successfully to: ${normalizedEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP] ✗ Login OTP email sending failed:', {
      recipient: normalizedEmail,
      code: error.code || 'UNKNOWN',
      command: error.command || 'SENDMAIL',
      response: error.response || error.message
    });
    throw new Error('Unable to send OTP. Please try again.');
  }
};

/**
 * Development test email sender (for verification only)
 */
export const sendTestEmail = async (toEmail) => {
  const normalizedEmail = (toEmail || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('SMTP transporter is not configured.');
  }

  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@nihongohub.com').trim();
  const info = await transporter.sendMail({
    from: `"NihongoHub" <${from}>`,
    to: normalizedEmail,
    subject: 'NihongoHub SMTP Test',
    text: 'This is a test email from NihongoHub.',
    html: '<p>This is a test email from NihongoHub.</p>'
  });

  return { success: true, messageId: info.messageId, response: info.response };
};

export const emailService = {
  createTransporter,
  verifySmtpConnection,
  sendSignupOTP,
  sendLoginOTP,
  sendTestEmail,
  _getLastTestOtp,
  _clearTestOtp
};
