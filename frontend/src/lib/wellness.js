// Shared constants + helpers so every page shows the same numbers and labels.

export const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Delhi NCR', 'Hyderabad', 'Jaipur', 'Chennai'];
export const DURATIONS = [1, 3, 6, 12];
export const TIERS = ['ELITE', 'PRO', 'HOME'];
export const DEDUCTION_MONTHS = 3; // fixed payroll deduction period
export const ENROLMENT = { start: '2026-10-10', end: '2026-10-31' }; // shown in the Home banner
export const POLICY_VERSION = 'v1.0';
export const DOMAIN = '@hindujarenewables.com';

/* Tier colours as design tokens ({ color, bg }) per the ACH build spec. */
export const TIER_STYLE = {
  ELITE: { color: 'var(--surface)', bg: 'var(--brand)' },
  ELITE_ONEPASS: { color: 'var(--surface)', bg: 'var(--level-5)' },
  PRO: { color: 'var(--surface)', bg: 'var(--level-7)' },
  PRO_ONEPASS: { color: 'var(--surface)', bg: 'var(--action)' },
  ONEPASS: { color: 'var(--surface)', bg: 'var(--level-4)' },
  HOME: { color: 'var(--surface)', bg: 'var(--level-4)' },
  OTHER: { color: 'var(--surface)', bg: 'var(--grey)' },
};

/* Backend package tiers (the 5 Cult.fit products) — used by the HR Console. */
export const PACKAGE_TIERS = [
  { code: 'ELITE', name: 'cultpass ELITE', access: ['ELITE', 'PRO'] },
  { code: 'ELITE_ONEPASS', name: 'cultpass ELITE + OnePass', access: ['ELITE', 'PRO', 'ONEPASS'] },
  { code: 'PRO', name: 'cultpass PRO', access: ['PRO'] },
  { code: 'PRO_ONEPASS', name: 'cultpass PRO + OnePass', access: ['PRO', 'ONEPASS'] },
  { code: 'ONEPASS', name: 'OnePass', access: ['ONEPASS'] },
];
export const GYM_TYPES = ['ELITE', 'PRO', 'ONEPASS'];
export const TIER_LABEL = { ELITE: 'ELITE', ELITE_ONEPASS: 'ELITE + OnePass', PRO: 'PRO', PRO_ONEPASS: 'PRO + OnePass', ONEPASS: 'OnePass', HOME: 'HOME', OTHER: 'Other' };

// The backend's activationStatus values (same order as OptInRequest.STATUSES)
export const STATUSES = ['Submitted', 'HR Approved', 'Sent to Cult.fit', 'Active', 'Expiring', 'Issue', 'To cancel', 'Rejected'];
export const STEPS = ['Submitted', 'HR Approved', 'Sent to Cult.fit', 'Active'];
/** Statuses an approver can set; the rest belong to service tracking (matches the backend). */
export const APPROVAL_STATUSES = ['Submitted', 'HR Approved', 'Rejected'];
/* Status badge colours as design tokens ({ color, bg }). */
export const STATUS_STYLE = {
  Submitted: { color: 'var(--action)', bg: 'var(--selected-tint)' },
  'HR Approved': { color: 'var(--warn-text)', bg: 'var(--warn-soft)' },
  'Sent to Cult.fit': { color: 'var(--level-7)', bg: 'var(--navy-tint)' },
  Active: { color: 'var(--success-text)', bg: 'var(--success-soft)' },
  Expiring: { color: 'var(--level-6)', bg: 'var(--warn-soft)' },
  Issue: { color: 'var(--danger)', bg: 'var(--danger-soft)' },
  'To cancel': { color: 'var(--grey)', bg: 'var(--surface-3)' },
  Rejected: { color: 'var(--danger)', bg: 'var(--danger-soft)' },
};

/* HR module permissions (keys match backend User.PERMISSIONS). */
export const PERMISSIONS = [
  { key: 'viewOptIns', label: 'View opt-ins' },
  { key: 'approveOptIns', label: 'Approve / reject' },
  { key: 'reports', label: 'Reports & export' },
  { key: 'serviceTracking', label: 'Service tracking' },
  { key: 'packagesGyms', label: 'Packages & gyms' },
];
/** Super Admin can do everything; a sub-admin needs at least one of `perms`. */
export const can = (user, ...perms) =>
  /super/i.test(String(user?.role || '')) || perms.some((p) => user?.permissions?.[p] === true);
export const findStatus = (s) =>
  STATUSES.find((x) => x.toLowerCase() === String(s || '').trim().toLowerCase()) || String(s || 'Submitted');

/* ── Formatting ── */
export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const inrLakh = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return inr(v);
};
export const months = (d) => `${d} month${Number(d) > 1 ? 's' : ''}`;
export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const shortDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');
export const errText = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

/** Accepts [] or { data: [] } / { packages: [] } etc. */
export const asList = (data, ...keys) => {
  if (Array.isArray(data)) return data;
  for (const k of [...keys, 'data', 'items', 'results']) if (Array.isArray(data?.[k])) return data[k];
  return [];
};

export const isRealId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));

/* ── Users / roles ── */
export const isAdminRole = (role) => typeof role === 'string' && /admin/i.test(role);
export const isSuperAdmin = (role) => typeof role === 'string' && /super/i.test(role);
export const userName = (u) => u?.fullName || u?.name || u?.email || 'Employee';
export const userEmpId = (u) => u?.employeeId || u?.empId || u?.employeeCode || '';
export const userLocation = (u) => u?.location || u?.workLocation || u?.city || '';

/* ── Packages ── */
export const tierOf = (p = {}) => {
  const raw = String(p.tier || p.packageName || p.name || '').toUpperCase();
  return TIERS.find((t) => raw.includes(t)) || 'OTHER';
};

const DEFAULT_ACCESS = { ELITE: 'ELITE & PRO gyms', PRO: 'PRO gyms', HOME: '—', OTHER: '—' };
export const GYM_TYPES_FOR = { ELITE: ['ELITE', 'PRO'], PRO: ['PRO'], HOME: [], OTHER: [] };

/** One shape for every page, whatever the backend calls the fields. */
export function normalisePackage(p = {}, city) {
  const tier = tierOf(p);
  const durationMonths = Number(p.durationMonths) || 1;
  const mrp = Number(p.mrp) || 0;
  const corporatePrice = Number(p.corporatePriceInclGst ?? p.corporatePrice) || 0;
  const savings = Math.max(0, mrp - corporatePrice);
  const access = Array.isArray(p.gymAccess)
    ? p.gymAccess.length ? `${p.gymAccess.join(' & ')} gyms` : '—'
    : p.gymAccess || DEFAULT_ACCESS[tier];

  return {
    ...p,
    tier,
    packageName: p.packageName || `cultpass ${tier}`,
    durationMonths,
    mrp,
    corporatePrice,
    corporatePriceInclGst: corporatePrice,
    savings,
    discountPct: mrp ? Math.round((savings / mrp) * 100) : 0,
    perMonth: Math.round(corporatePrice / durationMonths),
    deductionMonths: DEDUCTION_MONTHS,
    monthlyDeduction: Math.round(corporatePrice / DEDUCTION_MONTHS),
    gymAccessLabel: access,
    groupClasses: p.groupClasses || (tier === 'ELITE' ? 'Unlimited' : tier === 'PRO' ? '2 / month' : tier === 'HOME' ? 'Online only' : '—'),
    city: city || p.city || '',
  };
}

export const sortPackages = (a, b) =>
  TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.durationMonths - b.durationMonths;

/* Sample rate card from the wireframe — used only while the backend has no packages */
const S = {
  ELITE: { mrp: [2500, 6500, 13000, 24000], cp: [1999, 4499, 8999, 15999], inc: 'All ELITE + PRO gyms, unlimited group classes, online workouts', centres: 85, pause: [0, 7, 15, 30], guests: [0, 1, 2, 4] },
  PRO: { mrp: [1600, 4200, 8000, 15000], cp: [1299, 2999, 5499, 9999], inc: 'All PRO gyms, 2 ELITE sessions / month, online workouts', centres: 120, pause: [0, 7, 10, 20], guests: [0, 0, 1, 2] },
  HOME: { mrp: [400, 1000, 1800, 3000], cp: [299, 699, 1199, 1999], inc: 'Live & recorded online workouts, yoga, meditation', centres: null, pause: [0, 0, 0, 0], guests: [0, 0, 0, 0] },
};
export const SAMPLE_PACKAGES = TIERS.flatMap((tier) =>
  DURATIONS.map((d, i) => ({
    _id: `sample-${tier}-${d}`,
    isSample: true,
    packageName: `cultpass ${tier}`,
    durationMonths: d,
    mrp: S[tier].mrp[i],
    corporatePriceInclGst: S[tier].cp[i],
    inclusions: S[tier].inc,
    centreCount: S[tier].centres,
    pauseDays: S[tier].pause[i],
    guestPasses: S[tier].guests[i],
  }))
);

/* ── Requests ── */
export function normaliseRequest(r = {}) {
  const pd = r.packageDetails || r.package || {};
  const price = Number(pd.corporatePrice ?? pd.corporatePriceInclGst) || 0;
  const emp = r.employee || r.user || {};
  const snap = r.employeeSnapshot || {};
  return {
    ...r,
    refId: r.referenceId || r.refId || String(r._id || '').slice(-8).toUpperCase(),
    status: findStatus(r.activationStatus || r.status),
    tier: tierOf(pd),
    tierCode: pd.tier || tierOf(pd), // backend tier code, e.g. PRO_ONEPASS
    activatedAt: r.activatedAt || null,
    serviceNote: r.serviceNote || '',
    deductionMonths: Number(pd.deductionPeriodMonths) || DEDUCTION_MONTHS,
    workLocation: (r.formData && r.formData.workLocation) || snap.location || '',
    packageName: pd.packageName || '—',
    durationMonths: Number(pd.durationMonths) || 0,
    city: pd.city || r.city || '—',
    mrp: Number(pd.mrp) || 0,
    price,
    monthlyDeduction: Math.round(price / DEDUCTION_MONTHS),
    inclusions: pd.inclusions || '',
    employeeName: emp.fullName || emp.name || snap.fullName || '—',
    employeeEmail: emp.email || snap.email || '',
    employeeId: snap.employeeId || emp.employeeId || emp.empId || '',
    location: (r.formData && r.formData.workLocation) || snap.location || emp.location || emp.workLocation || '',
    memberId: r.cultFitMemberId || r.cultfitMemberId || '',
    createdAt: r.createdAt || r.submittedAt,
    form: r.formData || {},
  };
}

/* ── Gyms ── */
export const normaliseGym = (g = {}) => ({
  ...g,
  name: g.gymName || g.name || '—',
  type: String(g.type || '').toUpperCase(),
  mapsUrl: g.googleMapsLink || g.mapsUrl || '',
});

export const openMaps = (g) => {
  const url = /^https:\/\//i.test(g.mapsUrl || '')
    ? g.mapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${g.name} ${g.address || ''} ${g.area || ''} ${g.city || ''}`)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
