import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { OTP } from '../models/OTP.js';
import { emailService } from '../services/emailService.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * Generates JWT containing user ID and activeSessionId
 */
const generateToken = (id, sessionId) => {
  const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  return jwt.sign({ id, sessionId }, secret, { expiresIn: '30d' });
};

/**
 * Generates cryptographically secure 6-digit OTP
 */
const generate6DigitOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Computes SHA-256 hash of an OTP string
 */
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
};

/**
 * Resolves active authentication mode: 'password' or 'otp'.
 * Default: 'password'
 */
const getAuthMode = () => {
  return (process.env.AUTH_MODE || 'password').toLowerCase().trim() === 'otp' ? 'otp' : 'password';
};

/**
 * @route   GET /api/auth/config
 * @desc    Get safe client authentication mode (never reveals any secrets)
 * @access  Public
 */
router.get('/config', (req, res) => {
  return res.status(200).json({
    success: true,
    authMode: getAuthMode()
  });
});

// ==========================================
// 1. SIGNUP & SIGNUP OTP
// ==========================================

/**
 * @route   POST /api/auth/signup (and alias /register)
 * @desc    Validate signup details. If password mode: creates user directly. If OTP mode: sends OTP.
 * @access  Public
 */
const handleSignup = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is connecting or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const authMode = getAuthMode();
    const rawName = req.body.name || req.body.fullName;
    const { email, password, confirmPassword, selectedLevel } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    // In OTP mode, name is strictly required
    if (authMode === 'otp' && !rawName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name.'
      });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please re-enter.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ==========================================
    // PASSWORD MODE DIRECT SIGNUP
    // ==========================================
    if (authMode === 'password') {
      const totalUsers = await User.countDocuments();
      const role = totalUsers === 0 ? 'admin' : 'user';
      const sessionId = crypto.randomUUID();
      const finalName = (rawName || email.split('@')[0] || 'Student').trim();

      const newUser = await User.create({
        name: finalName,
        email: normalizedEmail,
        passwordHash,
        role,
        selectedLevel: selectedLevel || 'N5',
        emailVerified: true,
        activeSessionId: sessionId,
        lastActivityAt: new Date()
      });

      const token = generateToken(newUser._id, sessionId);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: newUser.toSafeObject()
      });
    }

    // ==========================================
    // OTP MODE SIGNUP FLOW (PRESERVED)
    // ==========================================
    // Check resend rate-limit (60s cooldown)
    const existingOtp = await OTP.findOne({ email: normalizedEmail, purpose: 'signup' });
    if (existingOtp && existingOtp.lastResentAt && (Date.now() - new Date(existingOtp.lastResentAt).getTime()) < 60000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP.'
      });
    }

    // Generate secure 6-digit OTP
    const otp = generate6DigitOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    console.log(`OTP generated successfully for email: ${normalizedEmail}`);

    // Upsert pending signup OTP record
    await OTP.findOneAndUpdate(
      { email: normalizedEmail, purpose: 'signup' },
      {
        email: normalizedEmail,
        purpose: 'signup',
        otpHash,
        signupData: {
          name: (rawName || 'Student').trim(),
          passwordHash,
          selectedLevel: selectedLevel || 'N5'
        },
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        lastResentAt: new Date()
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Dispatch email
    try {
      await emailService.sendSignupOTP(normalizedEmail, otp);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again later.'
      });
    }

    return res.status(200).json({
      success: true,
      otpPending: true,
      message: 'Enter the OTP sent to your email.'
    });
  } catch (error) {
    console.error('Signup initiation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.'
    });
  }
};

router.post('/signup', handleSignup);
router.post('/register', handleSignup); // Backwards compatibility

/**
 * @route   POST /api/auth/signup/verify-otp
 * @desc    Verify signup OTP. ONLY on success create User in MongoDB with emailVerified: true.
 * @access  Public
 */
router.post('/signup/verify-otp', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is connecting or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and 6-digit OTP.'
      });
    }

    const trimmedOtp = otp.toString().trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpDoc = await OTP.findOne({ email: normalizedEmail, purpose: 'signup' });

    if (!otpDoc || new Date() > otpDoc.expiresAt) {
      if (otpDoc) await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: 'This OTP has expired. Please request a new OTP.'
      });
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP hash
    const submittedHash = hashOtp(trimmedOtp);
    if (submittedHash !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        await OTP.deleteOne({ _id: otpDoc._id });
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.'
        });
      }
      await otpDoc.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP Verified! Immediately invalidate the OTP
    await OTP.deleteOne({ _id: otpDoc._id });

    // Check if account was created concurrently
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Determine initial role: first registered user becomes admin
    const totalUsers = await User.countDocuments();
    const role = totalUsers === 0 ? 'admin' : 'user';

    // Create the permanent User in MongoDB
    await User.create({
      name: otpDoc.signupData?.name || 'Student',
      email: normalizedEmail,
      passwordHash: otpDoc.signupData?.passwordHash,
      role,
      selectedLevel: otpDoc.signupData?.selectedLevel || 'N5',
      emailVerified: true,
      activeSessionId: null
    });

    // DO NOT automatically log in after signup; redirect user to Login page
    return res.status(201).json({
      success: true,
      message: 'Account verified successfully. Please sign in.',
      redirect: 'login'
    });
  } catch (error) {
    console.error('Signup OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification. Please try again.'
    });
  }
});

// ==========================================
// 2. LOGIN & LOGIN OTP (SINGLE-SESSION RESTRICTION)
// ==========================================

/**
 * Helper to extract client token from headers or cookies
 */
const getClientToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

/**
 * Checks if a user's session is genuinely active on another device.
 * If the session is stale (inactive >= SESSION_IDLE_TIMEOUT_MINUTES or missing activity date),
 * or if the request is from the same session, it invalidates the stale session and returns false.
 * Only returns true if the session is actively in use on another device.
 */
const checkAnotherDeviceActiveSession = async (user, req) => {
  if (!user.activeSessionId) {
    return false;
  }

  const idleTimeoutMinutes = parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '60', 10);
  const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;
  const now = Date.now();
  const lastActivityTime = user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : 0;

  // Stale check: if lastActivityAt is missing (legacy) or elapsed >= idleTimeoutMs
  const isStale = lastActivityTime === 0 || (now - lastActivityTime >= idleTimeoutMs);

  let isSameSession = false;
  const clientToken = getClientToken(req);
  if (clientToken) {
    try {
      const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
      let decoded = null;
      try {
        decoded = jwt.verify(clientToken, secret);
      } catch (_) {
        decoded = jwt.decode(clientToken);
      }
      if (decoded && decoded.sessionId && decoded.sessionId === user.activeSessionId) {
        isSameSession = true;
      }
    } catch (_) {}
  }

  if (isStale || isSameSession) {
    // Invalidate stale or current-device session reference server-side
    user.activeSessionId = null;
    await user.save();
    return false;
  }

  // Genuinely active session on another device (< 60 minutes of inactivity)
  return true;
};

/**
 * @route   POST /api/auth/login
 * @desc    Validate credentials, check single active session, send Login OTP
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is connecting or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Single-Session Enforcement: Check if user already has an active session on another device
    const hasAnotherDeviceActive = await checkAnotherDeviceActiveSession(user, req);
    if (hasAnotherDeviceActive) {
      return res.status(409).json({
        success: false,
        code: 'SESSION_ACTIVE',
        message: 'This account is already logged in on another device. Please log out from that device before logging in here.'
      });
    }

    const authMode = getAuthMode();

    // ==========================================
    // PASSWORD MODE DIRECT LOGIN
    // ==========================================
    if (authMode === 'password') {
      const sessionId = crypto.randomUUID();
      user.activeSessionId = sessionId;
      user.emailVerified = true;
      user.lastActivityAt = new Date();
      await user.save();

      const token = generateToken(user._id, sessionId);

      return res.status(200).json({
        success: true,
        token,
        user: user.toSafeObject()
      });
    }

    // ==========================================
    // OTP MODE LOGIN FLOW (PRESERVED)
    // ==========================================
    // Check resend rate-limit (60s cooldown)
    const existingOtp = await OTP.findOne({ email: normalizedEmail, purpose: 'login' });
    if (existingOtp && existingOtp.lastResentAt && (Date.now() - new Date(existingOtp.lastResentAt).getTime()) < 60000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP.'
      });
    }

    // Generate secure 6-digit OTP
    const otp = generate6DigitOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    console.log(`OTP generated successfully for email: ${normalizedEmail}`);

    // Upsert pending login OTP record
    await OTP.findOneAndUpdate(
      { email: normalizedEmail, purpose: 'login' },
      {
        email: normalizedEmail,
        purpose: 'login',
        otpHash,
        userId: user._id,
        attempts: 0,
        maxAttempts: 5,
        expiresAt,
        lastResentAt: new Date()
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Dispatch email
    try {
      await emailService.sendLoginOTP(normalizedEmail, otp);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again later.'
      });
    }

    return res.status(200).json({
      success: true,
      otpPending: true,
      message: 'Enter the OTP sent to your email.'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/login/verify-otp
 * @desc    Verify login OTP, create activeSessionId, issue JWT token
 * @access  Public
 */
router.post('/login/verify-otp', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is connecting or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and 6-digit OTP.'
      });
    }

    const trimmedOtp = otp.toString().trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpDoc = await OTP.findOne({ email: normalizedEmail, purpose: 'login' });

    if (!otpDoc || new Date() > otpDoc.expiresAt) {
      if (otpDoc) await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: 'This OTP has expired. Please request a new OTP.'
      });
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP hash
    const submittedHash = hashOtp(trimmedOtp);
    if (submittedHash !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        await OTP.deleteOne({ _id: otpDoc._id });
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.'
        });
      }
      await otpDoc.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // OTP verified! Invalidate immediately
    await OTP.deleteOne({ _id: otpDoc._id });

    // Fetch user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Concurrency check: Ensure no active session was established in the meantime on another device
    const hasAnotherDeviceActive = await checkAnotherDeviceActiveSession(user, req);
    if (hasAnotherDeviceActive) {
      return res.status(409).json({
        success: false,
        code: 'SESSION_ACTIVE',
        message: 'This account is already logged in on another device. Please log out from that device before logging in here.'
      });
    }

    // Generate unique active session ID
    const sessionId = crypto.randomUUID();
    user.activeSessionId = sessionId;
    user.emailVerified = true;
    user.lastActivityAt = new Date();
    await user.save();

    // Generate token encoded with both user id and sessionId
    const token = generateToken(user._id, sessionId);

    return res.status(200).json({
      success: true,
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification. Please try again.'
    });
  }
});

// ==========================================
// 3. RESEND OTP
// ==========================================

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP for pending signup or login with 60s rate limit
 * @access  Public
 */
router.post('/resend-otp', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is connecting or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const { email, purpose } = req.body;

    if (!email || !purpose || !['signup', 'login'].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resend request parameters.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpDoc = await OTP.findOne({ email: normalizedEmail, purpose });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification request found. Please start over.'
      });
    }

    // Check 60s cooldown
    const timeSinceLastResend = Date.now() - new Date(otpDoc.lastResentAt || 0).getTime();
    if (timeSinceLastResend < 60000) {
      const waitSeconds = Math.ceil((60000 - timeSinceLastResend) / 1000);
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP.',
        waitSeconds
      });
    }

    // Generate new OTP and reset attempts
    const otp = generate6DigitOtp();
    console.log(`OTP generated successfully for email: ${normalizedEmail}`);
    otpDoc.otpHash = hashOtp(otp);
    otpDoc.attempts = 0;
    otpDoc.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    otpDoc.lastResentAt = new Date();
    await otpDoc.save();

    // Dispatch email
    try {
      if (purpose === 'signup') {
        await emailService.sendSignupOTP(normalizedEmail, otp);
      } else {
        await emailService.sendLoginOTP(normalizedEmail, otp);
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again later.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during resend. Please try again.'
    });
  }
});

// ==========================================
// 4. LOGOUT (INVALIDATES ACTIVE SESSION)
// ==========================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear activeSessionId from MongoDB
 * @access  Public
 */
router.post('/logout', async (req, res) => {
  try {
    const token = getClientToken(req);

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
        let decoded = null;
        try {
          decoded = jwt.verify(token, secret);
        } catch (_) {
          decoded = jwt.decode(token);
        }
        if (decoded && (decoded.id || decoded._id)) {
          const userId = decoded.id || decoded._id;
          await User.findByIdAndUpdate(userId, { activeSessionId: null });
        }
      } catch (e) {
        // Token could be already expired or malformed; still return success
      }
    }

    // Also support passing userId or email in request body for guaranteed session clearing
    if (req.body && (req.body.userId || req.body.email)) {
      if (req.body.userId) {
        await User.findByIdAndUpdate(req.body.userId, { activeSessionId: null });
      } else if (req.body.email) {
        await User.findOneAndUpdate({ email: req.body.email.toLowerCase().trim() }, { activeSessionId: null });
      }
    }

    res.clearCookie('token');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout.'
    });
  }
});

// ==========================================
// 5. PROFILE & ADMIN PROMOTION
// ==========================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }
    return res.json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.'
    });
  }
});

/**
 * @route   POST /api/auth/promote-admin
 * @desc    Promote user to admin using ADMIN_SECRET_KEY
 * @access  Public (protected by secret key)
 */
router.post('/promote-admin', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected or unavailable. Please check MONGO_URI in .env.'
      });
    }

    const { email, secretKey } = req.body;
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'nihongohub_admin_promotion_secret_key_2026';

    if (!secretKey || secretKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid administrator secret key.'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user email to promote.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No user found with email "${email}".`
      });
    }

    user.role = 'admin';
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.email} is now an Administrator!`,
      user: user.toSafeObject()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error promoting user to admin.'
    });
  }
});

/**
 * @route   POST /api/auth/continue-session (and alias /heartbeat)
 * @desc    Explicitly update user's lastActivityAt timestamp to extend the active session
 * @access  Protected
 */
router.post('/continue-session', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();
    await User.findByIdAndUpdate(userId, { lastActivityAt: now });

    return res.json({
      success: true,
      message: 'Session extended successfully.',
      lastActivityAt: now
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error continuing session.' });
  }
});

router.post('/heartbeat', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();
    await User.findByIdAndUpdate(userId, { lastActivityAt: now });

    return res.json({
      success: true,
      message: 'Heartbeat acknowledged.',
      lastActivityAt: now
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error during heartbeat.' });
  }
});

export default router;
