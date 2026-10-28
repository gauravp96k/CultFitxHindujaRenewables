const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const limitMessage = (msg) => ({ error: msg, message: msg });
/** Positive whole number from the environment, or the default. */
const envInt = (name, fallback) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/*
 * Per-network (per-IP) limits, a safety net against abuse.
 * The real per-person protection is in authController: per email address,
 * one OTP every 30 s, 5 OTPs per hour and 5 wrong attempts per OTP.
 *
 * Everyone in an office reaches the portal from the same public IP, so these limits
 * must cover a whole office logging in at once (e.g. on enrolment day), not one person.
 */
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: envInt('OTP_SEND_LIMIT_PER_IP', 150),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many OTP requests from this network. Please wait a few minutes and try again.'),
});
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: envInt('OTP_VERIFY_LIMIT_PER_IP', 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many login attempts from this network. Please wait a few minutes and try again.'),
});

router.post('/send-otp', sendLimiter, sendOtp);
router.post('/verify-otp', verifyLimiter, verifyOtp);
router.get('/me', protect, me);

module.exports = router;
