import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Verify active server-side session
    if (!user.activeSessionId || !decoded.sessionId || user.activeSessionId !== decoded.sessionId) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_INVALID',
        message: 'Your session has ended or this account was logged into from another device. Please log in again.'
      });
    }

    // Server-side Idle / Inactivity Timeout Check
    const idleTimeoutMinutes = parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '60', 10);
    const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;
    const now = Date.now();
    const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt).getTime() : 0;

    if (lastActivity === 0 || (now - lastActivity >= idleTimeoutMs)) {
      // Invalidate session in DB
      user.activeSessionId = null;
      await user.save();

      return res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Your session expired due to inactivity. Please log in again.'
      });
    }

    // Meaningful activity occurred: throttle lastActivityAt updates (e.g. > 30s) to avoid unnecessary DB writes
    if (now - lastActivity > 30 * 1000) {
      user.lastActivityAt = new Date(now);
      await user.save();
    }

    // Attach user to request securely
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      selectedLevel: user.selectedLevel,
      createdAt: user.createdAt
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is invalid or expired.'
    });
  }
};

/**
 * Optional authentication: if token is present and valid, attaches req.user.
 * If token is absent or invalid, simply proceeds without failing.
 */
export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (user && user.activeSessionId === decoded.sessionId) {
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        selectedLevel: user.selectedLevel
      };
    }
  } catch (_) {
    // Silently continue for optional auth
  }

  next();
};
