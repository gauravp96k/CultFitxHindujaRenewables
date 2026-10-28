/*
 * Read-only list endpoints for the Cult.fit data loaded by seed/seed-cultfit.cjs.
 *
 * Reads the MongoDB collections directly, so it works whatever your Package / Gym
 * Mongoose schemas look like (fields such as tier, gymAccess, platformFee are always returned).
 *
 *   const catalog = require('../controllers/catalogController');
 *
 *   GET /api/v1/packages?city=Mumbai   -> packages for that city (all cities if city is empty)
 *   GET /api/v1/gyms?city=Mumbai&type=ELITE&q=andheri
 */
const mongoose = require('mongoose');

const PACKAGE_COLLECTION = process.env.PACKAGE_COLLECTION || 'packages';
const GYM_COLLECTION = process.env.GYM_COLLECTION || 'gyms';
const GYM_TYPES = ['ELITE', 'PRO', 'ONEPASS'];

// req.query is not covered by the mongo-sanitize wrapper, so every value is forced to a short plain string.
const str = (v, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, 'i');

/** Inactive rows are only for HR users who manage packages & gyms (Super Admin or packagesGyms). */
function wantsInactive(req) {
  if (String(req.query.includeInactive || '') !== '1') return false;
  const u = req.user || {};
  const role = String(u.role || '').toLowerCase().replace(/[\s_-]/g, '');
  return role === 'superadmin' || Boolean(u.permissions && u.permissions.packagesGyms === true);
}

function db() {
  const d = mongoose.connection && mongoose.connection.db;
  if (!d) {
    const err = new Error('Database is not connected');
    err.statusCode = 503;
    throw err;
  }
  return d;
}

async function getPackages(req, res, next) {
  try {
    const city = str(req.query.city);
    const filter = wantsInactive(req) ? {} : { isActive: { $ne: false } };
    if (city) filter.$or = [{ city: exactCI(city) }, { city: { $in: [null, ''] } }, { city: { $exists: false } }];

    const items = await db()
      .collection(PACKAGE_COLLECTION)
      .find(filter)
      .sort({ city: 1, packageName: 1, durationMonths: 1 })
      .limit(2000)
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getGyms(req, res, next) {
  try {
    const city = str(req.query.city);
    const type = str(req.query.type, 10).toUpperCase();
    const q = str(req.query.q, 60);

    const filter = wantsInactive(req) ? {} : { isActive: { $ne: false } };
    if (city) filter.city = exactCI(city);
    if (GYM_TYPES.includes(type)) filter.type = type;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ gymName: rx }, { area: rx }, { address: rx }];
    }

    const items = await db()
      .collection(GYM_COLLECTION)
      .find(filter, {
        projection: { gymName: 1, type: 1, centerType: 1, area: 1, city: 1, address: 1, timings: 1, googleMapsLink: 1, isActive: 1 },
      })
      .sort({ city: 1, gymName: 1 })
      .limit(5000)
      .toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPackages, getGyms };
