const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const { logAudit } = require('../middleware/auditMiddleware');

const TYPES = ['ELITE', 'PRO', 'ONEPASS'];
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (res, status, msg, errors) => res.status(status).json({ error: msg, message: msg, ...(errors ? { errors } : {}) });

/** Audit must never break the main action: if it fails, log it and carry on. */
async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (e) {
    console.error('[audit] failed to write entry:', e.message);
  }
}

/** Only the Gym Master fields, cleaned. `partial` keeps missing fields out (for updates). */
function pickGym(body = {}, partial = false) {
  const out = {};
  const put = (k, v) => {
    if (!partial || body[k] !== undefined) out[k] = v;
  };
  put('gymName', str(body.gymName, 150));
  put('type', str(body.type, 10).toUpperCase());
  put('centerType', str(body.centerType, 40));
  put('area', str(body.area, 100));
  put('city', str(body.city, 60));
  put('address', str(body.address, 300));
  put('timings', str(body.timings, 100));
  put('googleMapsLink', str(body.googleMapsLink, 500));
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive);
  else if (!partial) out.isActive = true;
  return out;
}

function checkGym(g, partial = false) {
  const e = {};
  if ((!partial || g.gymName !== undefined) && !g.gymName) e.gymName = 'Gym name is required';
  if ((!partial || g.type !== undefined) && !TYPES.includes(g.type)) e.type = 'Type must be ELITE, PRO or ONEPASS';
  if ((!partial || g.city !== undefined) && !g.city) e.city = 'City is required';
  if (g.googleMapsLink && !/^https:\/\//i.test(g.googleMapsLink)) e.googleMapsLink = 'Maps link must start with https://';
  return e;
}

// 1. Get all gyms with optional city and type filters (not routed; the catalog controller serves reads)
exports.getGyms = async (req, res) => {
  try {
    const city = str(req.query.city, 60);
    const type = str(req.query.type, 10).toUpperCase();
    const query = { isActive: true };
    if (city && city !== 'All') query.city = city;
    if (TYPES.includes(type)) query.type = type;
    const gyms = await Gym.find(query).sort({ city: 1, gymName: 1 });
    res.status(200).json(gyms);
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({ error: 'Failed to retrieve gym list.' });
  }
};

// 2. Add a single gym
exports.createGym = async (req, res) => {
  try {
    const g = pickGym(req.body);
    const errors = checkGym(g);
    if (Object.keys(errors).length) return fail(res, 400, 'Please fix the highlighted fields.', errors);

    const newGym = await Gym.create(g);
    await safeAudit(req.user, 'Gym added', newGym.gymName, `Added in ${newGym.city}${newGym.area ? ` (${newGym.area})` : ''}`);
    res.status(201).json({ message: 'Gym added successfully', gym: newGym });
  } catch (error) {
    console.error('Error creating gym:', error);
    res.status(500).json({ error: 'Failed to add gym.' });
  }
};

// 3. Edit a gym / switch it on or off.  PUT /gyms/:id
exports.updateGym = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 404, 'Gym not found.');
    const gym = await Gym.findById(id);
    if (!gym) return fail(res, 404, 'Gym not found.');

    const updates = pickGym(req.body, true);
    const errors = checkGym(updates, true);
    if (Object.keys(errors).length) return fail(res, 400, 'Please fix the highlighted fields.', errors);

    const changed = Object.keys(updates).filter((k) => String(gym[k] ?? '') !== String(updates[k] ?? ''));
    const was = gym.isActive !== false;
    Object.assign(gym, updates);
    await gym.save();

    if (changed.length) {
      const detail = changed.includes('isActive') && changed.length === 1
        ? `${was ? 'Active' : 'Inactive'} → ${gym.isActive ? 'Active' : 'Inactive'}`
        : `Changed: ${changed.join(', ')}`;
      await safeAudit(req.user, 'Gym updated', gym.gymName, detail);
    }
    res.status(200).json({ message: 'Gym updated', gym });
  } catch (error) {
    console.error('Error updating gym:', error);
    res.status(500).json({ error: 'Failed to update gym.' });
  }
};

// 4. Bulk upload gym list (validated, upserted by gym name + city)
exports.bulkUploadGyms = async (req, res) => {
  try {
    const gymsData = req.body && req.body.gyms;
    if (!Array.isArray(gymsData) || gymsData.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty gym data format.' });
    }
    if (gymsData.length > 5000) return res.status(400).json({ error: 'Upload at most 5,000 gyms at a time.' });

    const problems = [];
    const clean = gymsData.map((item, i) => {
      const g = pickGym(item);
      const errors = checkGym(g);
      if (Object.keys(errors).length) problems.push({ row: i + 2, issue: Object.values(errors).join('; ') });
      return g;
    });
    if (problems.length) {
      return res.status(400).json({ error: `${problems.length} row(s) have errors. Nothing was imported.`, problems: problems.slice(0, 200) });
    }

    const result = await Gym.bulkWrite(
      clean.map((g) => ({ updateOne: { filter: { gymName: g.gymName, city: g.city }, update: { $set: g }, upsert: true } })),
      { ordered: false }
    );
    const created = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;

    await safeAudit(req.user, 'Gym list uploaded', `${clean.length} gyms`, `${created} new · ${updated} updated`);
    res.status(200).json({ message: `Imported ${clean.length} gym centres (${created} new, ${updated} updated).`, created, updated });
  } catch (error) {
    console.error('Error in bulk gym upload:', error);
    res.status(500).json({ error: 'Failed to bulk upload gym list.' });
  }
};
