import 'dotenv/config';
import { Resend } from 'resend';

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
 * Returns Resend client instance if RESEND_API_KEY is configured
 */
let _resendClient = null;
export const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!_resendClient) {
    _resendClient = new Resend(apiKey);
  }
  return _resendClient;
};

/**
 * Lightweight verification of Email/Resend configuration during server startup
 * Does NOT send a real email or block startup.
 */
export const verifyEmailService = async () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = (process.env.EMAIL_FROM || 'NihongoHub <onboarding@resend.dev>').trim();

  if (!apiKey) {
    console.log('[Email] ⚠️  RESEND_API_KEY is not configured in environment variables. Email/OTP delivery will be disabled until configured.');
    return false;
  }

  console.log(`[Email] ✓ Resend HTTPS Email API configured (Sender: ${from})`);
  return true;
};

// Backward compatibility alias for any existing imports
export const verifySmtpConnection = verifyEmailService;

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
 * Sends Signup Verification OTP Email via Resend HTTPS API
 * @param {string} email 
 * @param {string} otp 
 */
export const sendSignupOTP = async (email, otp) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  _lastTestOtpStore[normalizedEmail] = otp;

  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV === 'test') {
      return { success: true, simulated: true };
    }
    console.error('[Email] ✗ Cannot send OTP email: RESEND_API_KEY is not configured in environment variables');
    throw new Error('Unable to send OTP. Please try again.');
  }

  const from = (process.env.EMAIL_FROM || 'NihongoHub <onboarding@resend.dev>').trim();

  const html = renderEmailTemplate({
    title: 'Verify Your NihongoHub Account',
    subtitle: 'Thank you for signing up with NihongoHub! Please use the 6-digit verification code below to complete your registration:',
    otp,
    warningMessage: 'This code will expire in <strong>5 minutes</strong>. If you did not create an account on NihongoHub, please disregard this email.'
  });

  try {
    const response = await resend.emails.send({
      from,
      to: normalizedEmail,
      subject: 'Verify Your NihongoHub Account',
      text: `Your NihongoHub verification code is: ${otp}. It expires in 5 minutes.`,
      html
    });

    if (response.error) {
      console.error('[Email] ✗ Resend delivery error:', {
        recipient: normalizedEmail,
        name: response.error.name || 'ResendError',
        message: response.error.message || 'Failed to dispatch email'
      });
      throw new Error('Unable to send OTP. Please try again.');
    }

    console.log(`[Email] ✓ Signup OTP email sent successfully via Resend to: ${normalizedEmail} (Id: ${response.data?.id})`);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    if (error.message === 'Unable to send OTP. Please try again.') {
      throw error;
    }
    console.error('[Email] ✗ Signup OTP email sending failed:', {
      recipient: normalizedEmail,
      message: error.message || 'Unknown network error'
    });
    throw new Error('Unable to send OTP. Please try again.');
  }
};

/**
 * Sends Login Verification OTP Email via Resend HTTPS API
 * @param {string} email 
 * @param {string} otp 
 */
export const sendLoginOTP = async (email, otp) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  _lastTestOtpStore[normalizedEmail] = otp;

  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV === 'test') {
      return { success: true, simulated: true };
    }
    console.error('[Email] ✗ Cannot send OTP email: RESEND_API_KEY is not configured in environment variables');
    throw new Error('Unable to send OTP. Please try again.');
  }

  const from = (process.env.EMAIL_FROM || 'NihongoHub <onboarding@resend.dev>').trim();

  const html = renderEmailTemplate({
    title: 'Your NihongoHub Login OTP',
    subtitle: 'A login request was made for your NihongoHub account. Please enter the 6-digit code below to sign in:',
    otp,
    warningMessage: 'This code expires in <strong>5 minutes</strong>. <strong>Never share this code with anyone.</strong> If you did not initiate this login, your credentials may be compromised.'
  });

  try {
    const response = await resend.emails.send({
      from,
      to: normalizedEmail,
      subject: 'Your NihongoHub Login OTP',
      text: `Your NihongoHub login verification code is: ${otp}. It expires in 5 minutes.`,
      html
    });

    if (response.error) {
      console.error('[Email] ✗ Resend delivery error:', {
        recipient: normalizedEmail,
        name: response.error.name || 'ResendError',
        message: response.error.message || 'Failed to dispatch email'
      });
      throw new Error('Unable to send OTP. Please try again.');
    }

    console.log(`[Email] ✓ Login OTP email sent successfully via Resend to: ${normalizedEmail} (Id: ${response.data?.id})`);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    if (error.message === 'Unable to send OTP. Please try again.') {
      throw error;
    }
    console.error('[Email] ✗ Login OTP email sending failed:', {
      recipient: normalizedEmail,
      message: error.message || 'Unknown network error'
    });
    throw new Error('Unable to send OTP. Please try again.');
  }
};

/**
 * Safe development test email sender (for verification only)
 */
export const sendTestEmail = async (toEmail) => {
  const normalizedEmail = (toEmail || '').toLowerCase().trim();
  if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Invalid recipient email address.');
  }

  const resend = getResendClient();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  const from = (process.env.EMAIL_FROM || 'NihongoHub <onboarding@resend.dev>').trim();
  const response = await resend.emails.send({
    from,
    to: normalizedEmail,
    subject: 'NihongoHub Email Service Test',
    text: 'This is a test email from NihongoHub via Resend HTTPS API.',
    html: '<p>This is a test email from <strong>NihongoHub</strong> via Resend HTTPS API.</p>'
  });

  if (response.error) {
    throw new Error(response.error.message || 'Resend test email failed');
  }

  return { success: true, messageId: response.data?.id };
};

export const emailService = {
  getResendClient,
  verifyEmailService,
  verifySmtpConnection,
  sendSignupOTP,
  sendLoginOTP,
  sendTestEmail,
  _getLastTestOtp,
  _clearTestOtp
};
