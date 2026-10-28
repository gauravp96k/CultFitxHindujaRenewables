const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, hashOtp, otpMatches } = require('../utils/otp');
const { sendOtpEmail, isMailConfigured } = require('../config/mailer');

const { publicUser, canonicalRole } = User;

const DOMAIN = (process.env.CORPORATE_DOMAIN || 'hindujarenewables.com').toLowerCase();
const IS_PROD = process.env.NODE_ENV === 'production';
// Dev conveniences — both are switched off automatically when NODE_ENV=production.
const DEV_BYPASS = !IS_PROD && process.env.DEV_OTP_BYPASS !== 'false';
const DEV_OTP = '123456';
const AUTO_PROVISION = !IS_PROD && process.env.AUTO_PROVISION_USERS !== 'false';

const OTP_MINUTES = 5;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const HOUR = 60 * 60 * 1000;

const fail = (res, status, msg, extra = {}) => res.status(status).json({ error: msg, message: msg, ...extra });

const superAdminEmails = () =>
  (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Returns a clean lowercase corporate email, or null. Rejects objects (NoSQL injection) and other domains. */
function cleanEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email.endsWith(`@${DOMAIN}`) ? email : null;
}

const nameFromEmail = (email) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Employee';

/** Existing user, or a newly created one when allowed (dev auto-provisioning or SUPER_ADMIN_EMAILS bootstrap). */
async function findOrProvisionUser(email, { create }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const isBootstrapAdmin = superAdminEmails().includes(email);
  if (!isBootstrapAdmin && !AUTO_PROVISION) return null;
  if (!create) return { provisional: true };
  return User.create({ email, fullName: nameFromEmail(email), role: isBootstrapAdmin ? 'Super Admin' : 'Employee' });
}

// POST /api/v1/auth/send-otp   { email }
exports.sendOtp = async (req, res) => {
  try {
    const email = cleanEmail(req.body && req.body.email);
    if (!email) return fail(res, 400, `Please use your official @${DOMAIN} email ID`);

    const user = await findOrProvisionUser(email, { create: false });
    if (!user) return fail(res, 404, 'This email is not registered on the portal. Please contact HR.');
    if (user.isActive === false) return fail(res, 403, 'Your access has been disabled. Please contact HR.');

    const now = Date.now();
    const doc = await Otp.findOne({ email });

    if (doc && doc.lastSentAt && now - doc.lastSentAt.getTime() < RESEND_SECONDS * 1000) {
      const wait = Math.ceil((RESEND_SECONDS * 1000 - (now - doc.lastSentAt.getTime())) / 1000);
      return fail(res, 429, `Please wait ${wait} seconds before requesting a new OTP.`, { resendIn: wait });
    }
    const inWindow = doc && doc.windowStart && now - doc.windowStart.getTime() < HOUR;
    if (inWindow && doc.sendCount >= MAX_SENDS_PER_HOUR) {
      return fail(res, 429, 'Too many OTP requests. Please try again in an hour.');
    }

    const code = generateOtp();
    await Otp.updateOne(
      { email },
      {
        $set: {
          otpHash: hashOtp(email, code),
          expiresAt: new Date(now + OTP_MINUTES * 60 * 1000),
          attempts: 0,
          lastSentAt: new Date(now),
          sendCount: inWindow ? doc.sendCount + 1 : 1,
          windowStart: inWindow ? doc.windowStart : new Date(now),
          cleanupAt: new Date(now + HOUR),
        },
      },
      { upsert: true }
    );

    if (!isMailConfigured()) {
      if (IS_PROD) {
        console.error('[auth] SMTP is not configured — cannot send OTP');
        return fail(res, 500, 'Email service is not configured. Please contact IT.');
      }
      console.log(`[auth][dev] SMTP not configured. OTP for ${email}: ${code}`);
      return res.json({ message: 'OTP generated (development: check the backend console).', expiresIn: OTP_MINUTES * 60, resendIn: RESEND_SECONDS });
    }

    try {
      await sendOtpEmail(email, code, OTP_MINUTES);
    } catch (mailErr) {
      console.error('[auth] OTP email failed:', mailErr.message);
      await Otp.updateOne({ email }, { $set: { lastSentAt: null } }); // let the user retry straight away
      return fail(res, 502, 'Could not send the OTP email. Please try again.');
    }

    return res.json({ message: `OTP sent to ${email}`, expiresIn: OTP_MINUTES * 60, resendIn: RESEND_SECONDS });
  } catch (err) {
    console.error('[auth] sendOtp error:', err);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

// POST /api/v1/auth/verify-otp   { email, otp }  →  { token, user }
exports.verifyOtp = async (req, res) => {
  try {
    const email = cleanEmail(req.body && req.body.email);
    const otp = req.body && req.body.otp;
    if (!email) return fail(res, 400, `Please use your official @${DOMAIN} email ID`);
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return fail(res, 400, 'Enter the 6-digit OTP');

    const bypass = DEV_BYPASS && otp === DEV_OTP;
    if (!bypass) {
      const doc = await Otp.findOne({ email });
      if (!doc || !doc.otpHash || !doc.expiresAt || doc.expiresAt.getTime() < Date.now()) {
        return fail(res, 400, 'OTP has expired or was not requested. Please request a new OTP.');
      }
      if (doc.attempts >= MAX_ATTEMPTS) {
        return fail(res, 429, 'Too many wrong attempts. Please request a new OTP.');
      }
      if (!otpMatches(email, otp, doc.otpHash)) {
        const attempts = doc.attempts + 1;
        const left = MAX_ATTEMPTS - attempts;
        await Otp.updateOne({ email }, { $set: left > 0 ? { attempts } : { attempts, otpHash: null } });
        return fail(
          res,
          400,
          left > 0 ? `Incorrect OTP. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.` : 'Too many wrong attempts. Please request a new OTP.',
          { attemptsLeft: Math.max(0, left) }
        );
      }
    }
    await Otp.deleteOne({ email }); // one-time use

    const user = await findOrProvisionUser(email, { create: true });
    if (!user) return fail(res, 404, 'This email is not registered on the portal. Please contact HR.');
    if (user.isActive === false) return fail(res, 403, 'Your access has been disabled. Please contact HR.');

    // Normalise the stored role, apply the SUPER_ADMIN_EMAILS bootstrap, record the login.
    const role = superAdminEmails().includes(email) ? 'Super Admin' : canonicalRole(user.role);
    const now = new Date();
    await User.updateOne({ _id: user._id }, { $set: { role, lastLoginAt: now } }, { runValidators: false });
    user.role = role;
    user.lastLoginAt = now;

    if (!process.env.JWT_SECRET) {
      console.error('[auth] JWT_SECRET is not set');
      return fail(res, 500, 'Login is not configured. Please contact IT.');
    }
    const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      algorithm: 'HS256',
    });

    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[auth] verifyOtp error:', err);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

// GET /api/v1/auth/me  (protected) → fresh user details, used on page refresh
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
