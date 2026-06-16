const rateLimit = require('express-rate-limit');

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds window
  max: 1, // restrict to 1 request per window
  message: {
    success: false,
    message: 'Please wait 60 seconds before requesting another password reset.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const adminPasswordResetLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds window
  max: 50, // Admins can reset up to 50 passwords per minute
  message: {
    success: false,
    message: 'Too many password resets. Please wait a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  passwordResetLimiter,
  adminPasswordResetLimiter,
  loginLimiter,
  otpLimiter
};
