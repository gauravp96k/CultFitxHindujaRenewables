/*
 * Runs once when the server starts. In production it stops the server if login could not work safely,
 * instead of failing later when an employee tries to sign in.
 */
const { isMailConfigured, verifyMailer } = require('./mailer');

module.exports = async function startupCheck() {
  const prod = process.env.NODE_ENV === 'production';
  const problems = [];
  const warnings = [];

  const jwt = process.env.JWT_SECRET || '';
  if (!jwt) problems.push('JWT_SECRET is not set');
  else if (jwt.length < 32) (prod ? problems : warnings).push('JWT_SECRET should be at least 32 characters');
  if (!process.env.OTP_SECRET) (prod ? problems : warnings).push('OTP_SECRET is not set');
  if (!(process.env.MONGO_URI || process.env.MONGODB_URI)) warnings.push('MONGO_URI is not set (check your config/db.js variable name)');

  if (prod) {
    if (!isMailConfigured()) problems.push('Email is not configured: set MAIL_PROVIDER=graph and the GRAPH_* values');
    if (process.env.DEV_OTP_BYPASS === 'true') warnings.push('DEV_OTP_BYPASS is ignored in production (OTP 123456 does not work)');
    if (process.env.AUTO_PROVISION_USERS === 'true') warnings.push('AUTO_PROVISION_USERS is ignored in production (load employees with seed-employees.cjs)');
  } else {
    console.log('[startup] Development mode: OTP 123456 works and unknown work emails are auto-created.');
  }

  warnings.forEach((w) => console.warn(`[startup] WARNING: ${w}`));

  if (isMailConfigured()) {
    try {
      console.log(`[startup] Email OK: ${await verifyMailer()}`);
    } catch (e) {
      (prod ? problems : warnings).push(`Email check failed: ${e.message}`);
      if (!prod) console.warn(`[startup] WARNING: Email check failed: ${e.message}`);
    }
  } else if (!prod) {
    console.log('[startup] Email not configured: OTPs will be printed in this console.');
  }

  if (problems.length) {
    problems.forEach((p) => console.error(`[startup] ERROR: ${p}`));
    if (prod) {
      console.error('[startup] Server not started. Fix the settings above in backend/.env.');
      process.exit(1);
    }
  }
};
