/*
 * One-time import of the Cult.fit rate card + gym networks into MongoDB.
 * Data: packages.json + gyms.json (built from "Pricing for Hinduja Renewables - updated.xlsx";
 *       only gym rows marked Import = Y are included).
 *
 * From the backend folder:
 *   node seed/seed-cultfit.cjs --dry-run   → preview only, changes nothing
 *   node seed/seed-cultfit.cjs             → add new / update existing (safe to re-run)
 *
 * Collections default to "packages" and "gyms". Override if needed:
 *   PACKAGE_COLLECTION=packages GYM_COLLECTION=gyms node seed/seed-cultfit.cjs
 */
const path = require('path');
const fs = require('fs');
try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env') }); } catch { /* optional */ }
const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URL;
const PACKAGE_COLLECTION = process.env.PACKAGE_COLLECTION || 'packages';
const GYM_COLLECTION = process.env.GYM_COLLECTION || 'gyms';
const DRY = process.argv.includes('--dry-run');
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

async function upsert(col, docs, keyOf, label) {
  if (DRY) {
    let existing = 0;
    for (const d of docs) if (await col.countDocuments(keyOf(d), { limit: 1 })) existing += 1;
    console.log(`[dry-run] ${label}: ${docs.length - existing} new, ${existing} would be updated`);
    return;
  }
  const now = new Date();
  const ops = docs.map((d) => ({
    updateOne: { filter: keyOf(d), update: { $set: { ...d, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true },
  }));
  let created = 0, updated = 0;
  for (let i = 0; i < ops.length; i += 500) {
    const r = await col.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    created += r.upsertedCount; updated += r.modifiedCount;
  }
  console.log(`${label}: ${created} added, ${updated} updated, ${docs.length - created - updated} unchanged`);
}

(async () => {
  if (!URI) { console.error('No MongoDB connection string. Set MONGO_URI (or MONGODB_URI) in backend/.env'); process.exit(1); }
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  console.log(`Connected to "${db.databaseName}" → ${PACKAGE_COLLECTION}, ${GYM_COLLECTION}${DRY ? '  (DRY RUN)' : ''}`);
  await upsert(db.collection(PACKAGE_COLLECTION), load('packages.json'),
    (p) => ({ tier: p.tier, city: p.city, durationMonths: p.durationMonths }), 'Packages');
  await upsert(db.collection(GYM_COLLECTION), load('gyms.json'),
    (g) => ({ gymName: g.gymName, city: g.city, area: g.area, address: g.address }), 'Gyms');
  if (!DRY) {
    await db.collection(PACKAGE_COLLECTION).createIndex({ city: 1, tier: 1, durationMonths: 1 });
    await db.collection(GYM_COLLECTION).createIndex({ city: 1, type: 1 });
  }
  await mongoose.disconnect();
  console.log('Done.');
})().catch(async (err) => {
  console.error('Import failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
