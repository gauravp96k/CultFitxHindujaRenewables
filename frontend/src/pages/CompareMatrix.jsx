import React, { useEffect, useMemo, useState } from 'react';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { packageService } from '../services/api';

/*
 * Compare tab — Wireframe v3 screen 3.
 * Props (same as before):
 *   selectedIds        package _ids ticked on the Home tab
 *   setCurrentView     tab switcher from App.jsx
 *   setActivePackage   stores the chosen package for the opt-in form
 */

const DEDUCTION_MONTHS = 3; // fixed payroll deduction period
const TIERS = ['ELITE', 'PRO', 'HOME'];
const DURATIONS = [ 6, 12];
/* Categorical tier header colours drawn from the design tokens (section 2). */
const TIER_BG = { ELITE: 'var(--brand)', PRO: 'var(--level-7)', HOME: 'var(--level-4)' };

/* Local button recipes matching the spec (section 6.2). */
const btnBase = 'inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimarySm = `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;

/* Same sample rate card as Home.jsx — used only when the backend has no packages yet */
const SAMPLE = {
  ELITE: {
    mrp: { 1: 2500, 3: 6500, 6: 13000, 12: 24000 },
    cp: { 1: 1999, 3: 4499, 6: 8999, 12: 15999 },
    inclusions: 'All ELITE + PRO gyms, unlimited group classes, online workouts',
    gymAccess: 'ELITE & PRO gyms', groupClasses: 'Unlimited', centres: 85,
    pause: { 1: 0, 3: 7, 6: 15, 12: 30 }, guests: { 1: 0, 3: 1, 6: 2, 12: 4 },
  },
  PRO: {
    mrp: { 1: 1600, 3: 4200, 6: 8000, 12: 15000 },
    cp: { 1: 1299, 3: 2999, 6: 5499, 12: 9999 },
    inclusions: 'All PRO gyms, 2 ELITE sessions / month, online workouts',
    gymAccess: 'PRO gyms', groupClasses: '2 / month', centres: 120,
    pause: { 1: 0, 3: 7, 6: 10, 12: 20 }, guests: { 1: 0, 3: 0, 6: 1, 12: 2 },
  },
  HOME: {
    mrp: { 1: 400, 3: 1000, 6: 1800, 12: 3000 },
    cp: { 1: 299, 3: 699, 6: 1199, 12: 1999 },
    inclusions: 'Live & recorded online workouts, yoga, meditation',
    gymAccess: '—', groupClasses: 'Online only', centres: null,
    pause: { 1: 0, 3: 0, 6: 0, 12: 0 }, guests: { 1: 0, 3: 0, 6: 0, 12: 0 },
  },
};
const SAMPLE_PACKAGES = TIERS.flatMap((tier) =>
  DURATIONS.map((d) => ({
    _id: `${tier}-${d}`,
    tier,
    durationMonths: d,
    mrp: SAMPLE[tier].mrp[d],
    corporatePrice: SAMPLE[tier].cp[d],
    inclusions: SAMPLE[tier].inclusions,
    gymAccess: SAMPLE[tier].gymAccess,
    groupClasses: SAMPLE[tier].groupClasses,
    centreCount: SAMPLE[tier].centres,
    pauseDays: SAMPLE[tier].pause[d],
    guestPasses: SAMPLE[tier].guests[d],
  }))
);

/* ── Helpers ── */
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const months = (d) => `${d} month${d > 1 ? 's' : ''}`;

const tierOf = (p) => {
  const raw = String(p.tier || p.packageName || '').toUpperCase();
  return TIERS.find((t) => raw.includes(t)) || raw || 'OTHER';
};

/** Accepts both field styles: packageName / corporatePriceInclGst (yours) and tier / corporatePrice (new API). */
function normalise(p) {
  const tier = tierOf(p);
  const durationMonths = Number(p.durationMonths) || 1;
  const mrp = Number(p.mrp) || 0;
  const corporatePrice = Number(p.corporatePrice ?? p.corporatePriceInclGst) || 0;
  const savings = Math.max(0, mrp - corporatePrice);
  const access = Array.isArray(p.gymAccess) ? (p.gymAccess.length ? `${p.gymAccess.join(' & ')} gyms` : '—') : p.gymAccess;

  return {
    ...p,
    tier,
    durationMonths,
    mrp,
    corporatePrice,
    corporatePriceInclGst: corporatePrice, // keep your old field name for OptInForm
    savings,
    discountPct: mrp ? Math.round((savings / mrp) * 100) : 0,
    perMonth: Math.round(corporatePrice / durationMonths),
    deductionMonths: p.deductionMonths || DEDUCTION_MONTHS,
    monthlyDeduction: Math.round(corporatePrice / (p.deductionMonths || DEDUCTION_MONTHS)),
    gymAccessLabel: access || (tier === 'HOME' ? '—' : `${tier} gyms`),
  };
}

const show = (v) => (v === undefined || v === null || v === '' || v === 0 ? '—' : v);

const IncludedPill = () => (
  <span className="inline-flex items-center gap-1 text-[var(--success-text)]">
    <CheckOutlined sx={{ fontSize: 14 }} /> Included
  </span>
);

const blank = (v) => v === undefined || v === null || v === '' || v === 0 || v === '—';

/*
 * [label, render, hasValue?] — rows with a `hasValue` check are hidden when no compared
 * package has data for them (the live rate card has no MRP, group classes, centre count,
 * pause days or guest passes yet), so the table doesn't show rows of dashes.
 */
const FEATURES = [
  ['Duration', (p) => months(p.durationMonths)],
  ['MRP', (p) => <span className="text-[var(--muted-2)] line-through">{inr(p.mrp)}</span>, (p) => p.mrp > 0],
  ['Corporate price (incl. GST)', (p) => <span className="text-[15px] font-bold text-[var(--brand)]">{inr(p.corporatePrice)}</span>],
  ['GST', () => <IncludedPill />],
  ['You save', (p) => `${inr(p.savings)} (${p.discountPct}%)`, (p) => p.savings > 0],
  ['Effective / month', (p) => inr(p.perMonth)],
  ['Payroll deduction (fixed)', (p) => `${inr(p.monthlyDeduction)} × ${p.deductionMonths} months`],
  ['Gym access', (p) => p.gymAccessLabel],
  ['Group classes', (p) => show(p.groupClasses), (p) => !blank(p.groupClasses)],
  ['Online workouts', () => <span className="inline-flex items-center gap-1"><CheckOutlined sx={{ fontSize: 14 }} /> Unlimited</span>],
  ['Centres in city', (p) => (p.centreCount === null ? 'Online' : show(p.centreCount)), (p) => !blank(p.centreCount)],
  ['Membership pause', (p) => (p.pauseDays ? `${p.pauseDays} days` : '—'), (p) => !blank(p.pauseDays)],
  ['Guest passes', (p) => show(p.guestPasses), (p) => !blank(p.guestPasses)],
  ['Inclusions', (p) => <span className="text-[11px] text-[var(--muted)]">{p.inclusions || '—'}</span>, (p) => !blank(p.inclusions)],
  ['Transferable', () => <CloseOutlined sx={{ fontSize: 14 }} className="text-[var(--muted-2)]" />],
  ['Cancellation', () => 'Before activation only'],
  ['Validity starts', () => 'From activation date'],
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`m-0.5 inline-flex items-center rounded-[999px] px-[11px] py-[5px] text-[12px] font-bold transition-colors duration-[120ms] ${
        active
          ? 'bg-[var(--brand)] text-white'
          : 'bg-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--navy-tint)] hover:text-[var(--brand)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function CompareMatrix({ selectedIds = [], setCurrentView, setActivePackage }) {
  const [allPackages, setAllPackages] = useState([]);
  const [ids, setIds] = useState(selectedIds);
  const [tiers, setTiers] = useState(TIERS);
  const [durations, setDurations] = useState(DURATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => setIds(selectedIds), [selectedIds]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    packageService
      .getAll('')
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res?.data) ? res.data : res?.data?.packages || [];
        setAllPackages(list);
      })
      .catch((err) => {
        if (!alive) return;
        setAllPackages([]);
        setError(err?.response?.data?.error || err?.response?.data?.message || '');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Real packages first; fall back to sample ones (ids like "ELITE-12") sent from Home
  const columns = useMemo(() => {
    const pool = [...allPackages, ...SAMPLE_PACKAGES.filter((s) => !allPackages.some((p) => p._id === s._id))];
    return pool
      .filter((p) => ids.includes(p._id))
      .map(normalise)
      .filter((p) => tiers.includes(p.tier) && durations.includes(p.durationMonths))
      .sort((a, b) => a.durationMonths - b.durationMonths || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
  }, [allPackages, ids, tiers, durations]);

  const toggle = (setter) => (v) => setter((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));
  const toggleTier = toggle(setTiers);
  const toggleDuration = toggle(setDurations);
  const remove = (id) => setIds((xs) => xs.filter((x) => x !== id));

  const optFor = (p) => {
    setActivePackage(p);
    setCurrentView('form');
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setCurrentView('home')}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--action)] hover:underline"
      >
        <ArrowBackOutlined sx={{ fontSize: 14 }} /> Back to packages
      </button>

      <h2 className="mb-4 flex flex-wrap items-center gap-2 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">
        Compare packages
        <span className="rounded-[999px] bg-[var(--success-soft)] px-[9px] py-[3px] text-[11px] font-bold text-[var(--success-text)]">
          All prices incl. GST
        </span>
      </h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-6 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-5 py-3 shadow-[var(--shadow-card)]">
        <div className="text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]">
          Package filter:{' '}
          {TIERS.map((t) => (
            <Chip key={t} active={tiers.includes(t)} onClick={() => toggleTier(t)}>
              cultpass {t}
            </Chip>
          ))}
        </div>
        <div className="text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]">
          Duration filter:{' '}
          {DURATIONS.map((d) => (
            <Chip key={d} active={durations.includes(d)} onClick={() => toggleDuration(d)}>
              {months(d)}
            </Chip>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-soft)] px-3 py-2 text-[13px] text-[var(--warn-text)]">
          Could not load live packages ({error}). Showing sample data where available.
        </div>
      )}

      <div className="overflow-x-auto rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[13px] text-[var(--muted)]">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Loading packages…
          </div>
        ) : !columns.length ? (
          <div className="p-10 text-center text-[13px] text-[var(--muted)]">
            <p>No packages to compare.</p>
            <p className="mt-1">
              Tick <b>Add to compare</b> on the Home tab, or widen the filters above.
            </p>
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className={`${btnPrimarySm} mt-4`}
            >
              Browse packages
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-52 bg-[var(--brand)] p-3 text-left font-bold text-white">Feature</th>
                {columns.map((p) => (
                  <th key={p._id} className="min-w-40 p-3 text-center text-white" style={{ background: TIER_BG[p.tier] || 'var(--ink-2)' }}>
                    <div className="font-bold">{p.packageName || `cultpass ${p.tier}`}</div>
                    <div className="text-[11px] font-normal">{months(p.durationMonths)}</div>
                    <button
                      type="button"
                      onClick={() => remove(p._id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-normal underline opacity-90 hover:opacity-100"
                    >
                      <CloseOutlined sx={{ fontSize: 14 }} /> remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.filter(([, , hasValue]) => !hasValue || columns.some(hasValue)).map(([name, render], i) => (
                <tr key={name} className={i % 2 ? 'bg-[var(--surface-2)]' : ''}>
                  <td className="sticky left-0 z-10 border-t border-[var(--line-soft)] bg-[var(--surface-2)] p-3 font-semibold text-[var(--muted)]">
                    {name}
                  </td>
                  {columns.map((p) => (
                    <td key={p._id} className="border-t border-[var(--line-soft)] p-3 text-center text-[var(--ink)]">
                      {render(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 border-t border-[var(--line-soft)] bg-[var(--surface-2)] p-3" />
                {columns.map((p) => (
                  <td key={p._id} className="border-t border-[var(--line-soft)] p-3 text-center">
                    <button
                      type="button"
                      onClick={() => optFor(p)}
                      className={btnPrimarySm}
                    >
                      Opt for this
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
