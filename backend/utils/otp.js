const crypto = require('crypto');

const secret = () => {
  const s = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('OTP_SECRET or JWT_SECRET must be set');
  return s || 'dev-only-otp-secret';
};

const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const hashOtp = (email, code) => crypto.createHmac('sha256', secret()).update(`${email}:${code}`).digest('hex');

/** Constant-time comparison so response timing doesn't leak how close a guess was. */
function otpMatches(email, code, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashOtp(email, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { generateOtp, hashOtp, otpMatches };