import React, { useEffect, useMemo, useRef, useState } from 'react';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { packageService, gymService, requestService } from '../services/api';



const DEDUCTION_MONTHS = 3;
const PLATFORM_FEE = 80;
const ENROLMENT = { start: '2026-10-10', end: '2026-10-31' };

/* Categorical header colours drawn from the spec's design tokens (section 2). */
const PRODUCTS = {
  ELITE: { label: 'cultpass ELITE', access: ['ELITE', 'PRO'], bg: 'var(--brand)' },
  ELITE_ONEPASS: { label: 'cultpass ELITE + OnePass', access: ['ELITE', 'PRO', 'ONEPASS'], bg: 'var(--level-5)' },
  PRO: { label: 'cultpass PRO', access: ['PRO'], bg: 'var(--level-7)' },
  PRO_ONEPASS: { label: 'cultpass PRO + OnePass', access: ['PRO', 'ONEPASS'], bg: 'var(--action)' },
  ONEPASS: { label: 'OnePass', access: ['ONEPASS'], bg: 'var(--level-4)' },
};
const ORDER = Object.keys(PRODUCTS);
const NETWORK_LABEL = { ELITE: 'cult ELITE', PRO: 'cult PRO', ONEPASS: 'OnePass partner gyms' };

/* Local button recipes matching the spec (section 6.2). */
const btnBase = 'inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;
const btnSecondary = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`;
const btnPrimarySm = `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;
const btnSecondarySm = `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`;

/* Statuses that mean HR has approved the membership */
const APPROVED_STATUSES = ['HR Approved', 'Sent to Cult.fit', 'Active', 'Expiring', 'Issue'];
const STATUS_INFO = {
  'HR Approved': { color: 'var(--warn-text)', bg: 'var(--warn-soft)', note: 'Approved by HR. It will be sent to Cult.fit for activation shortly.' },
  'Sent to Cult.fit': { color: 'var(--level-7)', bg: 'var(--navy-tint)', note: 'Sent to Cult.fit. You will receive the activation link by SMS on your registered mobile number.' },
  Active: { color: 'var(--success-text)', bg: 'var(--success-soft)', note: 'Your membership is active. Book classes and gym slots in the cult.fit app.' },
  Expiring: { color: 'var(--warn-text)', bg: 'var(--warn-soft)', note: 'Your membership is expiring soon.' },
  Issue: { color: 'var(--danger)', bg: 'var(--danger-soft)', note: 'There is an issue with your activation. HR will contact you.' },
};

/* ── Helpers ── */
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const months = (d) => `${d} month${d > 1 ? 's' : ''}`;
const shortDate = (v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const fullDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const listOf = (data) => (Array.isArray(data) ? data : data?.packages || data?.gyms || data?.requests || data?.data || []);

function tierOf(p) {
  if (PRODUCTS[p.tier]) return p.tier;
  const n = String(p.packageName || '').toUpperCase().replace(/\s+/g, '');
  const one = n.includes('ONEPASS');
  if (n.includes('ELITE')) return one ? 'ELITE_ONEPASS' : 'ELITE';
  if (n.includes('PRO')) return one ? 'PRO_ONEPASS' : 'PRO';
  return 'ONEPASS';
}

function normalise(p) {
  const tier = tierOf(p);
  const price = Number(p.corporatePriceInclGst ?? p.corporatePrice) || 0;
  const mrp = Number(p.mrp) || 0;
  const durationMonths = Number(p.durationMonths) || 1;
  const savings = mrp > price ? mrp - price : 0;
  const gymAccess = Array.isArray(p.gymAccess) && p.gymAccess.length ? p.gymAccess : PRODUCTS[tier].access;
  return {
    ...p,
    tier,
    packageName: p.packageName || PRODUCTS[tier].label,
    city: p.city || '',
    durationMonths,
    mrp,
    savings,
    discountPct: savings ? Math.round((savings / mrp) * 100) : 0,
    corporatePrice: price,
    corporatePriceInclGst: price,
    platformFee: p.platformFee ?? PLATFORM_FEE,
    perMonth: Math.round(price / durationMonths),
    deductionMonths: DEDUCTION_MONTHS,
    monthlyDeduction: Math.round(price / DEDUCTION_MONTHS),
    gymAccess,
    accessLabel: gymAccess.map((t) => NETWORK_LABEL[t] || t).join(' + '),
  };
}

function errorMessage(err) {
  const status = err?.response?.status;
  if (status === 502 || status === 504 || !err?.response) {
    return 'Cannot reach the backend server. Make sure it is running (npm run dev in the backend folder).';
  }
  if (status === 401) return 'Your session has expired. Please log out and log in again.';
  return err?.response?.data?.error || err?.response?.data?.message || `Could not load packages (error ${status}).`;
}

/* ── Your membership (shown after HR approval) ── */
function MembershipCard({ r, showCatalog, onToggleCatalog }) {
  const d = r.packageDetails || {};
  const f = r.formData || {};
  const tier = tierOf(d);
  const info = STATUS_INFO[r.activationStatus] || STATUS_INFO['HR Approved'];
  const price = Number(d.corporatePrice ?? d.corporatePriceInclGst) || 0;
  const monthly = Number(d.monthlyPayrollDeduction) || Math.round(price / DEDUCTION_MONTHS);
  const rows = [
    ['Reference ID', r.referenceId],
    r.cultFitMemberId && ['Cult.fit member ID', r.cultFitMemberId],
    ['Duration', d.durationMonths ? months(d.durationMonths) : '—'],
    ['City', d.city || '—'],
    ['Amount (incl. GST)', inr(price)],
    ['Payroll deduction', `${inr(monthly)} × ${d.deductionPeriodMonths || DEDUCTION_MONTHS} months`],
    ['Preferred centre', f.preferredCentre || 'No preference'],
    ['Preferred start date', fullDate(f.preferredStartDate)],
    ['Requested on', fullDate(r.createdAt)],
  ].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-white" style={{ background: PRODUCTS[tier].bg }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">Your membership</p>
          <p className="text-[18px] font-bold">
            {d.packageName || PRODUCTS[tier].label} · {d.durationMonths ? months(d.durationMonths) : ''}
          </p>
        </div>
        <span className="rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold" style={{ color: info.color, background: info.bg }}>
          {r.activationStatus}
        </span>
      </div>
      <div className="p-5">
        <p className="mb-4 flex items-start gap-2 rounded-[8px] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink-2)]">
          <CheckCircleOutlineOutlined sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-[var(--success-text)]" /> {info.note}
        </p>
        <dl className="grid gap-x-6 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[45%_1fr] gap-2 border-b border-[var(--line-soft)] py-1.5 text-[13px]">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="font-semibold text-[var(--ink)]">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onToggleCatalog} className={`${btnSecondary} mt-4`}>
          {showCatalog ? 'Hide other packages' : 'View all packages'}
        </button>
      </div>
    </section>
  );
}

/* ── Package card ── */
function PackageCard({ pkg, city, centres, inCompare, onToggleCompare, onCompare, onOpt }) {
  const rows = [
    pkg.savings > 0 && ['You save', inr(pkg.savings)],
    ['Effective / month', inr(pkg.perMonth)],
    ['Payroll deduction', `${inr(pkg.monthlyDeduction)} × ${pkg.deductionMonths} months`],
    ['Platform fee', `${inr(pkg.platformFee)} per user (extra)`],
    ['Gym access', pkg.accessLabel],
    [`Centres in ${city}`, centres],
  ].filter(Boolean);

  return (
    <article
      className="flex flex-col overflow-hidden rounded-[12px] border bg-[var(--surface)] shadow-[var(--shadow-card)] transition"
      style={inCompare ? { borderColor: 'var(--brand)', boxShadow: 'var(--focus-ring)' } : { borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white" style={{ background: PRODUCTS[pkg.tier].bg }}>
        <span className="text-[13px]">
          <b>{pkg.packageName}</b> · {months(pkg.durationMonths)}
        </span>
        {inCompare && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-[999px] bg-white px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]">
            <CheckCircleOutlineOutlined sx={{ fontSize: 12 }} /> Selected
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {pkg.savings > 0 && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[var(--muted-2)] line-through">MRP {inr(pkg.mrp)}</span>
            <span className="rounded-[999px] bg-[var(--success-soft)] px-2 py-0.5 font-bold text-[var(--success-text)]">{pkg.discountPct}% off</span>
          </div>
        )}
        <div className="my-1 text-[22px] font-extrabold text-[var(--ink)]">{inr(pkg.corporatePrice)}</div>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex rounded-[999px] bg-[var(--success-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--success-text)]">
            Inclusive of GST
          </span>
          {pkg.b2bExclusive && (
            <span className="inline-flex rounded-[999px] bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">B2B exclusive</span>
          )}
        </div>

        <dl className="mt-3 flex-1 divide-y divide-[var(--line-soft)] text-[11px]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[45%_1fr] gap-2 py-1.5">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="text-[var(--ink)]">{v}</dd>
            </div>
          ))}
        </dl>

        <label
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] transition-colors duration-[120ms]"
          style={inCompare ? { background: 'var(--navy-tint)', color: 'var(--brand)', fontWeight: 600 } : undefined}
        >
          <input type="checkbox" checked={inCompare} onChange={onToggleCompare} style={{ accentColor: 'var(--action)' }} />
          {inCompare ? 'Added to compare' : 'Add to compare'}
        </label>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onCompare} className={`${btnSecondarySm} flex-1`}>
            Compare
          </button>
          <button type="button" onClick={onOpt} className={`${btnPrimarySm} flex-1`}>
            Opt for this
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Page ── */
export default function Home({
  city = 'Mumbai',
  setCity,
  selectedForCompare = [],
  setSelectedForCompare,
  onCompare,
  onOptIn,
}) {
  const [packages, setPackages] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [durations, setDurations] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [membership, setMembership] = useState(null); // latest HR-approved request
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [toast, setToast] = useState(null); // { text, added }
  const toastTimer = useRef(null);

  // The employee's own requests: show their membership once HR has approved it.
  useEffect(() => {
    let alive = true;
    requestService
      .getMyRequests()
      .then((res) => {
        if (!alive) return;
        const approved = listOf(res?.data)
          .filter((r) => APPROVED_STATUSES.includes(r.activationStatus))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setMembership(approved[0] || null);
      })
      .catch(() => alive && setMembership(null))
      .finally(() => alive && setMembershipChecked(true));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // All packages once — the city list and filters are built from the real data.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    packageService
      .getAll('')
      .then((res) => alive && setPackages(listOf(res?.data).map(normalise)))
      .catch((err) => {
        if (!alive) return;
        setPackages([]);
        setError(errorMessage(err));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // Gyms for the selected city (for the "Centres in …" count).
  useEffect(() => {
    let alive = true;
    setGyms([]);
    gymService
      .getGyms({ city })
      .then((res) => alive && setGyms(listOf(res?.data).filter((g) => same(g.city, city))))
      .catch(() => alive && setGyms(null));
    return () => {
      alive = false;
    };
  }, [city, reloadKey]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const cities = useMemo(() => [...new Set(packages.map((p) => p.city).filter(Boolean))].sort(), [packages]);

  useEffect(() => {
    if (cities.length && !cities.some((c) => same(c, city))) setCity?.(cities.includes('Mumbai') ? 'Mumbai' : cities[0]);
  }, [cities, city, setCity]);

  const inCity = useMemo(
    () =>
      packages
        .filter((p) => !p.city || same(p.city, city))
        .sort((a, b) => ORDER.indexOf(a.tier) - ORDER.indexOf(b.tier) || a.durationMonths - b.durationMonths),
    [packages, city],
  );
  const available = useMemo(() => [...new Set(inCity.map((p) => p.durationMonths))].sort((a, b) => a - b), [inCity]);
  const active = durations.filter((d) => available.includes(d));
  const shownDurations = active.length ? active : available;
  const visible = inCity.filter((p) => shownDurations.includes(p.durationMonths));
  const selectedCount = selectedForCompare.length;

  const centresFor = (p) => {
    if (gyms === null) return '—';
    if (!gyms.length) return '…';
    return gyms.filter((g) => p.gymAccess.includes(String(g.type).toUpperCase())).length;
  };

  const showToast = (text, added) => {
    clearTimeout(toastTimer.current);
    setToast({ text, added, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const toggleDuration = (d) =>
    setDurations((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort((a, b) => a - b)));

  const toggleCompare = (pkg) => {
    const adding = !selectedForCompare.includes(pkg._id);
    setSelectedForCompare?.((ids) => (ids.includes(pkg._id) ? ids.filter((x) => x !== pkg._id) : [...ids, pkg._id]));
    showToast(`${pkg.packageName} · ${months(pkg.durationMonths)} ${adding ? 'added to' : 'removed from'} compare`, adding);
  };

  const compareWith = (id) => {
    if (id && !selectedForCompare.includes(id)) setSelectedForCompare?.((ids) => [...ids, id]);
    onCompare?.();
  };

  const hasMembership = membershipChecked && Boolean(membership);
  const catalogVisible = !hasMembership || showCatalog;

  return (
    <div className={`flex-1 bg-[var(--bg)] text-[var(--ink)] ${selectedCount && catalogVisible ? 'pb-24' : ''}`}>
      {/* ── Hero ── */}
      <section className="px-5 py-7 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--action))' }}>
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[22px] font-bold leading-[34.1px] tracking-[-0.22px]">
            {hasMembership ? 'Your Cult.fit Membership' : 'Find Your Cult.fit Membership'}
          </h1>
          <p className="mt-1 text-[13px] opacity-95">
            Enrolment open: {shortDate(ENROLMENT.start)} – {shortDate(ENROLMENT.end)} {new Date(ENROLMENT.end).getFullYear()} ·{' '}
            <b>All prices are inclusive of GST</b> · Paid through payroll deduction over a fixed period of{' '}
            <b>{DEDUCTION_MONTHS} months</b> · Platform fee {inr(PLATFORM_FEE)} per user
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 p-5">
        {hasMembership && (
          <MembershipCard r={membership} showCatalog={showCatalog} onToggleCatalog={() => setShowCatalog((s) => !s)} />
        )}

        {catalogVisible && (
          <div>
            {/* ── Filters ── */}
            <div className="grid items-end gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_2fr_auto]">
              <div>
                <label htmlFor="city" className="mb-1.5 block text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]">
                  Select City <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  id="city"
                  value={city}
                  disabled={!cities.length}
                  onChange={(e) => setCity?.(e.target.value)}
                  className="h-[38px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] outline-none transition-colors duration-[120ms] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)] disabled:bg-[var(--surface-2)]"
                >
                  {(cities.length ? cities : [city]).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]">
                  Select Duration(s) – pick more than one to compare
                </span>
                <div className="flex flex-wrap">
                  {available.map((d) => {
                    const on = shownDurations.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDuration(d)}
                        className={`m-0.5 inline-flex items-center rounded-[999px] px-[11px] py-[5px] text-[12px] font-bold transition-colors duration-[120ms] ${
                          on
                            ? 'bg-[var(--brand)] text-white'
                            : 'bg-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--navy-tint)] hover:text-[var(--brand)]'
                        }`}
                      >
                        {months(d)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="button" onClick={() => compareWith()} disabled={!selectedCount} className={btnPrimary}>
                <SwapHorizOutlined sx={{ fontSize: 15 }} /> Compare selected ({selectedCount})
              </button>
            </div>

            {/* ── Packages ── */}
            <h2 className="mb-3 mt-6 text-[16px] font-bold text-[var(--ink)]">
              {visible.length} packages available in {city}
            </h2>

            {error && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
                <span className="flex-1">{error}</span>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1 font-bold underline">
                  <RefreshOutlined sx={{ fontSize: 14 }} /> Retry
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-[13px] text-[var(--muted)]">Loading packages…</div>
            ) : error ? null : !visible.length ? (
              <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
                <FitnessCenterOutlined sx={{ fontSize: 28 }} className="mx-auto mb-2 text-[var(--muted-2)]" />
                <p className="font-bold text-[var(--ink)]">No packages found</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {packages.length ? 'Try another city.' : 'The database has no packages yet. Run the seed script in the backend.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <PackageCard
                    key={p._id}
                    pkg={p}
                    city={city}
                    centres={centresFor(p)}
                    inCompare={selectedForCompare.includes(p._id)}
                    onToggleCompare={() => toggleCompare(p)}
                    onCompare={() => compareWith(p._id)}
                    onOpt={() => onOptIn?.({ ...p, city })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Pop-up when a package is added / removed ── */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed right-4 top-20 z-50 flex max-w-sm items-start gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[13px] shadow-[var(--shadow-overlay)]"
        >
          <CheckCircleOutlineOutlined sx={{ fontSize: 18 }} className={`mt-0.5 shrink-0 ${toast.added ? 'text-[var(--success-text)]' : 'text-[var(--muted-2)]'}`} />
          <span className="flex-1">{toast.text}</span>
          <button type="button" aria-label="Close" onClick={() => setToast(null)} className="text-[var(--muted-2)] hover:text-[var(--ink)]">
            <CloseOutlined sx={{ fontSize: 16 }} />
          </button>
        </div>
      )}

      {/* ── Compare bar ── */}
      {selectedCount > 0 && catalogVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 shadow-[0_-6px_12px_-8px_rgba(15,23,42,.18)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <p className="text-[13px]">
              <b className="text-[var(--brand)]">{selectedCount}</b> package{selectedCount > 1 ? 's' : ''} selected for compare
              {selectedCount === 1 && <span className="text-[var(--muted)]"> · select one more to compare side by side</span>}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedForCompare?.([])} className={btnSecondary}>
                Clear
              </button>
              <button type="button" onClick={() => compareWith()} className={btnPrimary}>
                <SwapHorizOutlined sx={{ fontSize: 15 }} /> Compare now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
