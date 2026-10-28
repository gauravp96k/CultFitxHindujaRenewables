const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');

const { canonicalRole } = User;

const fail = (res, status, msg) => res.status(status).json({ error: msg, message: msg });

/**
 * Writes an immutable audit entry. Called as:
 *   logAudit(user, action, recordReference, oldToNewState)
 *
 * `user` is the acting Mongoose user document (req.user). The role is snapshotted
 * at the time of the action. Returns the created document. Callers should still
 * wrap this so a logging failure never breaks the main action.
 */
async function logAudit(user, action, recordReference, oldToNewState) {
  return AuditTrail.create({
    timestamp: new Date(),
    user: user && user._id ? user._id : undefined,
    role: canonicalRole(user && user.role),
    action: String(action || '').slice(0, 200),
    recordReference: String(recordReference || '').slice(0, 200),
    oldToNewState: String(oldToNewState || '').slice(0, 500),
  });
}

/**
 * Checks the Bearer token and loads the user from the database on every request,
 * so a disabled user or a changed role takes effect immediately.
 * Sets req.user to the full Mongoose user document.
 */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return fail(res, 401, 'Not authorised. Please log in.');
    if (!process.env.JWT_SECRET) {
      console.error('[auth] JWT_SECRET is not set');
      return fail(res, 500, 'Login is not configured. Please contact IT.');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return fail(res, 401, 'Your session has expired. Please log in again.');
    }

    const user = await User.findById(payload.id);
    if (!user || user.isActive === false) return fail(res, 401, 'Your session is no longer valid. Please log in again.');

    req.user = user;
    return next();
  } catch (err) {
    console.error('[auth] protect error:', err);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

module.exports = { protect, logAudit };
