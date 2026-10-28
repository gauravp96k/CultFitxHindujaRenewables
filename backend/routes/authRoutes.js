const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const limitMessage = (msg) => ({ error: msg, message: msg });

// Per-IP limits on top of the per-email limits in the controller.
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many OTP requests from this network. Please try again later.'),
});
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Too many login attempts. Please try again later.'),
});

router.post('/send-otp', sendLimiter, sendOtp);
router.post('/verify-otp', verifyLimiter, verifyOtp);
router.get('/me', protect, me);

module.exports = router;
