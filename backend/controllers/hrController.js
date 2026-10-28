const mongoose = require('mongoose');
const OptInRequest = require('../models/OptInRequest');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');
const { logAudit } = require('../middleware/auditMiddleware');

const { PERMISSIONS, canonicalRole, publicUser } = User;
const DOMAIN = (process.env.CORPORATE_DOMAIN || 'hindujarenewables.com').toLowerCase();
const EMAIL_RX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const EMP_ID_RX = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const ADMIN_ROLES = ['Sub-admin', 'Super Admin'];
const PERM_LABEL = {
  viewOptIns: 'View opt-ins',
  approveOptIns: 'Approve / reject',
  reports: 'Reports & export',
  serviceTracking: 'Service tracking',
  packagesGyms: 'Packages & gyms',
};

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (res, status, msg) => res.status(status).json({ error: msg, message: msg });

/** Audit must never break the main action: if it fails, log it and carry on. */
async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (e) {
    console.error('[audit] failed to write entry:', e.message);
  }
}

/** Keep only known permission keys and coerce to booleans. */
function cleanPermissions(input = {}) {
  return Object.fromEntries(PERMISSIONS.map((p) => [p, Boolean(input && input[p])]));
}

/** "Approve / reject: ✔ → ✖ · Reports & export: ✖ → ✔" */
function permissionDiff(before = {}, after = {}) {
  return PERMISSIONS.filter((p) => Boolean(before[p]) !== Boolean(after[p]))
    .map((p) => `${PERM_LABEL[p]}: ${before[p] ? '✔' : '✖'} → ${after[p] ? '✔' : '✖'}`)
    .join(' · ');
}

/** True when another active Super Admin exists besides `userId`. */
async function hasOtherSuperAdmin(userId) {
  return Boolean(await User.exists({ _id: { $ne: userId }, role: 'Super Admin', isActive: { $ne: false } }));
}

// 1. Dashboard KPIs
exports.getDashboardKPIs = async (req, res) => {
  try {
    const rows = await OptInRequest.aggregate([
      { $group: { _id: '$activationStatus', n: { $sum: 1 }, value: { $sum: '$packageDetails.corporatePrice' } } },
    ]);
    const by = Object.fromEntries(rows.map((r) => [r._id, r]));
    const count = (s) => (by[s] ? by[s].n : 0);
    const all = rows.reduce((n, r) => n + r.n, 0);
    const totalValue = rows.filter((r) => r._id !== 'Rejected').reduce((n, r) => n + (r.value || 0), 0);

    res.status(200).json({
      totalOptIns: all - count('Rejected'),
      pendingHR: count('Submitted'),
      approved: count('HR Approved'),
      sentToCult: count('Sent to Cult.fit'),
      activeMembers: count('Active'),
      expiring: count('Expiring'),
      issues: count('Issue'),
      toCancel: count('To cancel'),
      rejected: count('Rejected'),
      totalValue,
      byStatus: Object.fromEntries(rows.map((r) => [r._id, r.n])),
    });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
  }
};

// 2. Audit trail (read-only)
exports.getAuditLogs = async (req, res) => {
  try {
    const action = str(req.query.action, 80);
    const startDate = str(req.query.startDate, 30);
    const query = {};
    if (action && action !== 'All actions') query.action = new RegExp(escapeRegex(action), 'i');
    if (startDate && !Number.isNaN(new Date(startDate).getTime())) query.timestamp = { $gte: new Date(startDate) };

    const logs = await AuditTrail.find(query)
      .populate('user', 'employeeId fullName email')
      .sort({ timestamp: -1 })
      .limit(2000)
      .lean();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit trail.' });
  }
};

// 3. Add (or promote) an admin — Super Admin only
exports.createSubAdmin = async (req, res) => {
  try {
    const body = req.body || {};
    const email = str(body.email || body.officialEmail, 254).toLowerCase();
    const fullName = str(body.fullName, 100);
    const employeeId = str(body.employeeId, 20).toUpperCase();
    const location = str(body.location || body.workLocation, 80);
    const role = canonicalRole(body.role || 'Sub-admin');
    const permissions = cleanPermissions(body.permissions);

    if (!EMAIL_RX.test(email) || !email.endsWith(`@${DOMAIN}`)) return fail(res, 400, `Use an official @${DOMAIN} email.`);
    if (!ADMIN_ROLES.includes(role)) return fail(res, 400, 'Role must be Sub-admin or Super Admin.');
    if (employeeId && !EMP_ID_RX.test(employeeId)) return fail(res, 400, 'Employee ID must be 2–20 letters, numbers or hyphens.');
    if (role === 'Sub-admin' && !Object.values(permissions).some(Boolean)) return fail(res, 400, 'Give the sub-admin at least one module.');

    let user = await User.findOne({ email });
    const before = user ? { role: canonicalRole(user.role), permissions: { ...(user.permissions || {}) } } : null;

    if (user) {
      if (before.role === 'Super Admin' && role !== 'Super Admin' && !(await hasOtherSuperAdmin(user._id))) {
        return fail(res, 400, 'This is the only Super Admin. Add another Super Admin before changing this one.');
      }
      user.role = role;
      user.permissions = permissions;
      user.isActive = true;
      if (fullName) user.fullName = fullName;
      if (employeeId) user.employeeId = employeeId;
      if (location) user.location = location;
      await user.save();
    } else {
      if (!fullName) return fail(res, 400, 'Enter the full name for a new user.');
      user = await User.create({ email, fullName, role, permissions, location, ...(employeeId ? { employeeId } : {}) });
    }

    const diff = before ? permissionDiff(before.permissions, permissions) : '';
    await safeAudit(
      req.user,
      before ? 'Access changed' : `${role} added`,
      user.employeeId || email,
      before
        ? [before.role !== role ? `${before.role} → ${role}` : '', diff].filter(Boolean).join(' · ') || 'No change'
        : `— → ${role}`
    );

    res.status(before ? 200 : 201).json({ message: 'Access saved.', user: publicUser(user) });
  } catch (error) {
    if (error && error.code === 11000) return fail(res, 409, 'A user with this email or employee ID already exists.');
    console.error('Error adding sub-admin:', error);
    res.status(500).json({ error: 'Failed to configure sub-admin access.' });
  }
};

// 4. List admins (Super Admin + Sub-admins)
exports.getUsersAccessList = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ADMIN_ROLES } }).sort({ role: -1, fullName: 1 });
    res.status(200).json(users.map(publicUser));
  } catch (error) {
    console.error('Error fetching access list:', error);
    res.status(500).json({ error: 'Failed to retrieve user access list.' });
  }
};

// 5. Edit an admin's role / modules / status — Super Admin only
//    PATCH /hr/users/:id  { role?, permissions?, isActive? }
exports.updateUserAccess = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 404, 'User not found.');
    const user = await User.findById(id);
    if (!user) return fail(res, 404, 'User not found.');

    const body = req.body || {};
    const beforeRole = canonicalRole(user.role);
    const beforeActive = user.isActive !== false;
    const beforePerms = { ...(user.permissions || {}) };

    const role = body.role !== undefined ? canonicalRole(body.role) : beforeRole;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : beforeActive;
    const permissions = body.permissions !== undefined ? cleanPermissions(body.permissions) : cleanPermissions(beforePerms);

    const isSelf = String(user._id) === String(req.user._id);
    if (isSelf && (role !== beforeRole || !isActive)) return fail(res, 400, 'You cannot change your own role or disable yourself.');
    if (beforeRole === 'Super Admin' && (role !== 'Super Admin' || !isActive) && !(await hasOtherSuperAdmin(user._id))) {
      return fail(res, 400, 'This is the only Super Admin. Add another Super Admin first.');
    }
    if (role === 'Sub-admin' && isActive && !Object.values(permissions).some(Boolean)) {
      return fail(res, 400, 'Give the sub-admin at least one module, or remove admin access.');
    }

    user.role = role;
    user.isActive = isActive;
    user.permissions = permissions;
    await user.save();

    const changes = [
      beforeRole !== role ? `${beforeRole} → ${role}` : '',
      beforeActive !== isActive ? `${beforeActive ? 'Active' : 'Disabled'} → ${isActive ? 'Active' : 'Disabled'}` : '',
      permissionDiff(beforePerms, permissions),
    ].filter(Boolean);
    if (changes.length) await safeAudit(req.user, 'Access changed', user.employeeId || user.email, changes.join(' · '));

    res.status(200).json({ message: 'Access updated.', user: publicUser(user) });
  } catch (error) {
    console.error('Error updating user access:', error);
    res.status(500).json({ error: 'Failed to update access.' });
  }
};

// 6. Find employees to make admin — Super Admin only.  GET /hr/users/search?q=
exports.searchUsers = async (req, res) => {
  try {
    const q = str(req.query.q, 60);
    if (q.length < 2) return res.json([]);
    const rx = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ fullName: rx }, { email: rx }, { employeeId: rx }] })
      .sort({ fullName: 1 })
      .limit(10);
    res.json(users.map(publicUser));
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Search failed.' });
  }
};

// 7. Record an export in the audit trail.  POST /hr/exports { kind, rows }
exports.logExport = async (req, res) => {
  try {
    const kind = str(req.body && req.body.kind, 80) || 'Report';
    const rows = Math.max(0, Math.min(1e6, Number(req.body && req.body.rows) || 0));
    await safeAudit(req.user, 'Exported report', `${kind} (${rows} rows)`, '—');
    res.status(201).json({ message: 'Export recorded.' });
  } catch (error) {
    console.error('Error logging export:', error);
    res.status(500).json({ error: 'Failed to record export.' });
  }
};
