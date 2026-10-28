const Package = require('../models/Package');
const { logAudit } = require('../middleware/auditMiddleware');

const { PACKAGE_NAMES, TIERS } = Package;
const DURATIONS = [1, 3, 6, 12];
const GYM_NETWORKS = ['ELITE', 'PRO', 'ONEPASS'];

/** Audit must never break the main action: if it fails, log it and carry on. */
async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (e) {
    console.error('[audit] failed to write entry:', e.message);
  }
}

const fail = (res, status, msg, errors) =>
  res.status(status).json({ error: msg, message: msg, ...(errors ? { errors } : {}) });

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Pull only the schema fields out of the request body, coercing types. */
function pickPackageFields(body = {}) {
  const out = {};
  if (body.packageName !== undefined) out.packageName = str(body.packageName, 60);
  if (body.tier !== undefined) out.tier = str(body.tier, 20);
  if (body.durationMonths !== undefined) out.durationMonths = Number(body.durationMonths);
  if (body.city !== undefined) out.city = str(body.city, 60);
  if (body.corporatePriceInclGst !== undefined) out.corporatePriceInclGst = Number(body.corporatePriceInclGst);
  if (body.mrp !== undefined) out.mrp = body.mrp === null || body.mrp === '' ? null : Number(body.mrp);
  if (body.platformFee !== undefined) out.platformFee = Number(body.platformFee);
  if (body.gymAccess !== undefined) {
    out.gymAccess = Array.isArray(body.gymAccess)
      ? body.gymAccess.map((g) => str(g, 20)).filter((g) => GYM_NETWORKS.includes(g))
      : [];
  }
  if (body.inclusions !== undefined) out.inclusions = str(body.inclusions, 500);
  if (body.b2bExclusive !== undefined) out.b2bExclusive = Boolean(body.b2bExclusive);
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive);
  return out;
}

// 1. Get all packages (Employee & Admin view)
exports.getAllPackages = async (req, res) => {
  try {
    const city = str(req.query.city, 60);
    const query = req.query.activeOnly === 'false' ? {} : { isActive: true };
    if (city && city !== 'All') query.city = city;

    const packages = await Package.find(query).sort({ tier: 1, durationMonths: 1 }).lean();
    res.status(200).json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to retrieve packages.' });
  }
};

// 2. Add a new package (Super Admin only)
exports.createPackage = async (req, res) => {
  try {
    const fields = pickPackageFields(req.body);

    // Required fields per the Package schema.
    const errors = {};
    if (!PACKAGE_NAMES.includes(fields.packageName)) errors.packageName = 'Select a valid package name';
    if (!TIERS.includes(fields.tier)) errors.tier = 'Select a valid tier';
    if (!DURATIONS.includes(fields.durationMonths)) errors.durationMonths = 'Duration must be 1, 3, 6 or 12 months';
    if (!fields.city) errors.city = 'City is required';
    if (!(fields.corporatePriceInclGst >= 0)) errors.corporatePriceInclGst = 'Enter a valid corporate price';
    if (Object.keys(errors).length) return fail(res, 400, 'Please fix the highlighted fields.', errors);

    const newPackage = await Package.create(fields);

    await safeAudit(
      req.user,
      'Package Created',
      `${newPackage.packageName} · ${newPackage.city} · ${newPackage.durationMonths}m`,
      `Created with corporate price ₹${newPackage.corporatePriceInclGst}`
    );

    res.status(201).json({ message: 'Package created successfully', package: newPackage });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      const errors = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]));
      return fail(res, 400, 'Please fix the highlighted fields.', errors);
    }
    if (error && error.code === 11000) {
      return fail(res, 409, 'A package with this tier, city and duration already exists.');
    }
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package.' });
  }
};

// 3. Update an existing package price/details (Super Admin only)
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = pickPackageFields(req.body);

    const oldPackage = await Package.findById(id);
    if (!oldPackage) return res.status(404).json({ error: 'Package not found.' });

    Object.assign(oldPackage, updates);
    const updatedPackage = await oldPackage.save();

    await safeAudit(
      req.user,
      'Package Updated',
      `${updatedPackage.packageName} · ${updatedPackage.city} · ${updatedPackage.durationMonths}m`,
      `Corp price: ₹${oldPackage.corporatePriceInclGst} → ₹${updatedPackage.corporatePriceInclGst}`
    );

    res.status(200).json({ message: 'Package updated successfully', package: updatedPackage });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      const errors = Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]));
      return fail(res, 400, 'Please fix the highlighted fields.', errors);
    }
    if (error && error.code === 11000) {
      return fail(res, 409, 'A package with this tier, city and duration already exists.');
    }
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package.' });
  }
};
