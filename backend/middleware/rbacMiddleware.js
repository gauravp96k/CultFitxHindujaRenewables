const { canonicalRole } = require('../models/User');

const fail = (res, msg) => res.status(403).json({ error: msg, message: msg });
const roleOf = (req) => canonicalRole(req.user && req.user.role);

const isSuperAdmin = (req) => roleOf(req) === 'Super Admin';
const isAdmin = (req) => ['Super Admin', 'Sub-admin'].includes(roleOf(req));

// Use after protect.
const superAdminOnly = (req, res, next) => (isSuperAdmin(req) ? next() : fail(res, 'Super Admin access required.'));

const adminOnly = (req, res, next) => (isAdmin(req) ? next() : fail(res, 'HR admin access required.'));

/** Super Admin always passes; a Sub-admin needs at least one of the listed module permissions. */
const checkPermission = (...perms) => (req, res, next) => {
  if (isSuperAdmin(req)) return next();
  const p = (req.user && req.user.permissions) || {};
  if (roleOf(req) === 'Sub-admin' && perms.some((k) => p[k] === true)) return next();
  return fail(res, 'You do not have access to this module.');
};

module.exports = { superAdminOnly, adminOnly, checkPermission };
