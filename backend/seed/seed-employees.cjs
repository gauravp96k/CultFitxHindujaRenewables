/*
 * Loads the employee master list so login knows each employee's ID, name and location.
 *   node seed/seed-employees.cjs seed/employees.csv --dry-run
 *   node seed/seed-employees.cjs seed/employees.csv
 *
 * CSV columns (header names are matched loosely):
 *   Employee ID, Full Name, Email, Location, Department, Designation, Role
 * Role is optional (Employee / Sub-admin / Super Admin) and is only applied to NEW users,
 * so re-running the import never demotes an existing admin.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const DOMAIN = (process.env.CORPORATE_DOMAIN || 'hindujarenewables.com').toLowerCase();
const file = process.argv.find((a) => a.toLowerCase().endsWith('.csv'));
const DRY = process.argv.includes('--dry-run');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') q = false; else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i += 1; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const data = rows.filter((r) => r.some((x) => String(x).trim()));
  const head = data.shift().map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  return data.map((r, i) => ({ __row: i + 2, ...Object.fromEntries(head.map((h, j) => [h, String(r[j] || '').trim()])) }));
}

const pick = (r, ...keys) => keys.map((k) => r[k]).find((v) => v) || '';

(async () => {
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node seed/seed-employees.cjs <path-to-employees.csv> [--dry-run]');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) { console.error('Set MONGO_URI in backend/.env'); process.exit(1); }

  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const errors = [];
  const seen = new Set();
  const valid = [];
  for (const r of rows) {
    const email = pick(r, 'email', 'officialemail', 'emailid', 'officialemailid').toLowerCase();
    const doc = {
      employeeId: pick(r, 'employeeid', 'empid', 'employeecode').toUpperCase(),
      fullName: pick(r, 'fullname', 'name', 'employeename'),
      email,
      location: pick(r, 'location', 'worklocation', 'city'),
      department: pick(r, 'department'),
      designation: pick(r, 'designation'),
    };
    const issues = [];
    if (!doc.employeeId) issues.push('missing Employee ID');
    if (!doc.fullName) issues.push('missing name');
    if (!email.endsWith(`@${DOMAIN}`)) issues.push(`email must end with @${DOMAIN}`);
    if (seen.has(email)) issues.push('duplicate email');
    seen.add(email);
    if (issues.length) errors.push(`Row ${r.__row}: ${issues.join(', ')}`);
    else valid.push({ doc, role: User.canonicalRole(pick(r, 'role')) });
  }

  await mongoose.connect(uri);
  let added = 0;
  let updated = 0;
  for (const { doc, role } of valid) {
    if (DRY) { (await User.exists({ email: doc.email })) ? (updated += 1) : (added += 1); continue; }
    const r = await User.updateOne(
      { email: doc.email },
      { $set: doc, $setOnInsert: { role, isActive: true } },
      { upsert: true, runValidators: true }
    );
    if (r.upsertedCount) added += 1; else if (r.modifiedCount) updated += 1;
  }
  if (!DRY) await User.syncIndexes();
  console.log(`${DRY ? '[dry-run] ' : ''}Employees: ${added} added, ${updated} updated, ${errors.length} rows skipped`);
  errors.forEach((e) => console.log('  ' + e));
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('Import failed:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
