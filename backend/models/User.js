const mongoose = require('mongoose');

const ROLES = ['Employee', 'Sub-admin', 'Super Admin'];
const PERMISSIONS = ['viewOptIns', 'approveOptIns', 'reports', 'serviceTracking', 'packagesGyms'];

/** Maps any spelling (superadmin, SUPER_ADMIN, sub admin, …) to one of ROLES. */
function canonicalRole(value) {
  const r = String(value || '').toLowerCase().replace(/[\s_-]/g, '');
  if (r === 'superadmin') return 'Super Admin';
  if (r === 'subadmin') return 'Sub-admin';
  return 'Employee';
}

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    location: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'Employee', set: canonicalRole },
    permissions: Object.fromEntries(PERMISSIONS.map((p) => [p, { type: Boolean, default: false }])),
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Employee IDs are unique when present (users created before the employee import may not have one).
userSchema.index({ employeeId: 1 }, { unique: true, partialFilterExpression: { employeeId: { $type: 'string' } } });

/** The only user fields ever sent to the browser. */
function publicUser(u) {
  const role = canonicalRole(u.role);
  return {
    _id: u._id,
    employeeId: u.employeeId || '',
    fullName: u.fullName || '',
    email: u.email,
    location: u.location || '',
    department: u.department || '',
    designation: u.designation || '',
    role,
    permissions: Object.fromEntries(PERMISSIONS.map((p) => [p, role === 'Super Admin' || Boolean(u.permissions && u.permissions[p])])),
    isActive: u.isActive !== false,
    lastLoginAt: u.lastLoginAt || null,
  };
}

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
module.exports.PERMISSIONS = PERMISSIONS;
module.exports.canonicalRole = canonicalRole;
module.exports.publicUser = publicUser;
