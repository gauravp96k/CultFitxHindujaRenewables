/*
 * Bootstrap a Super Admin account (the first admin, who can then add other admins
 * from the HR Console).
 *
 *   node seed/create-super-admin.cjs <email> ["Full Name"] [EMPLOYEE_ID]
 *   node seed/create-super-admin.cjs name@hindujarenewables.com "Asha Rao" HR10001
 *
 * - Creates the user if they don't exist, or promotes an existing user.
 * - Super Admin gets every permission (enforced in the RBAC middleware), including
 *   adding / changing other admins via POST /api/v1/hr/sub-admin.
 * - Safe to re-run: it never demotes anyone and only fills in name / ID if given.
 * - Login is still by OTP sent to this email, so it must be a real mailbox.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');

const DOMAIN = (process.env.CORPORATE_DOMAIN || 'hindujarenewables.com').toLowerCase();
const EMAIL_RX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const EMP_ID_RX = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

const nameFromEmail = (email) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Super Admin';

(async () => {
  const [, , rawEmail, rawName, rawEmpId] = process.argv;
  const email = String(rawEmail || '').trim().toLowerCase();
  const fullName = String(rawName || '').trim();
  const employeeId = String(rawEmpId || '').trim().toUpperCase();

  if (!email) {
    console.error('Usage: node seed/create-super-admin.cjs <email> ["Full Name"] [EMPLOYEE_ID]');
    process.exit(1);
  }
  if (!EMAIL_RX.test(email) || !email.endsWith(`@${DOMAIN}`)) {
    console.error(`Email must be a valid @${DOMAIN} address.`);
    process.exit(1);
  }
  if (employeeId && !EMP_ID_RX.test(employeeId)) {
    console.error('Employee ID must be 2-20 letters, numbers or hyphens.');
    process.exit(1);
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGO_URI in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  try {
    if (employeeId) {
      const clash = await User.findOne({ employeeId, email: { $ne: email } }).select('email').lean();
      if (clash) throw new Error(`Employee ID ${employeeId} already belongs to ${clash.email}.`);
    }

    let user = await User.findOne({ email });
    const before = user ? user.role : '—';
    if (!user) {
      user = new User({ email, fullName: fullName || nameFromEmail(email) });
    } else if (fullName) {
      user.fullName = fullName;
    }
    if (employeeId) user.employeeId = employeeId;
    user.role = 'Super Admin';
    user.isActive = true;
    await user.save();

    await AuditTrail.create({
      user: user._id,
      role: 'Super Admin',
      action: 'Super Admin bootstrapped (CLI)',
      recordReference: email,
      oldToNewState: `${before} → Super Admin`,
    });

    const verb = before === '—' ? 'Created' : before === 'Super Admin' ? 'Already a Super Admin (details updated):' : `Promoted from ${before} to`;
    console.log(`${verb} Super Admin: ${user.fullName} <${user.email}>${user.employeeId ? ` (${user.employeeId})` : ''}`);
    console.log('Log in with this email (OTP) to open the HR Console and add other admins.');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
