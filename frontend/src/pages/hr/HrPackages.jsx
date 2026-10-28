import { useEffect, useMemo, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import { packageService } from '../../services/api';
import { downloadCsv, parseCsv, readFileText } from '../../lib/csv';
import {
  DEDUCTION_MONTHS,
  DURATIONS,
  GYM_TYPES,
  PACKAGE_TIERS,
  TIER_LABEL,
  asList,
  errText,
  inr,
} from '../../lib/wellness';
import {
  Banner,
  Field,
  FileButton,
  GstPill,
  IconButton,
  Modal,
  Note,
  PageHeader,
  Spinner,
  TierBadge,
  Toggle,
  btn,
  card,
  exportBtn,
  input,
  labelCls,
  useToast,
} from '../../components/ui';
import DataTable from '../../components/DataTable';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const lc = (v) => String(v ?? '').trim().toLowerCase();
const tierByName = (name) => PACKAGE_TIERS.find((t) => lc(t.name) === lc(name));
const tierIndex = (code) => {
  const i = PACKAGE_TIERS.findIndex((t) => t.code === code);
  return i < 0 ? 99 : i;
};
/** "₹1,999" / "1999" / "" → number (NaN when blank or not a number). */
const num = (v) => {
  const s = String(v ?? '').replace(/[₹,\s]/g, '');
  return s === '' ? NaN : Number(s);
};
const blank = (v) => String(v ?? '').trim() === '';
/** Y/N cell → boolean; blank → fallback; anything else → null (invalid). */
const yn = (v, fallback) => {
  const s = lc(v);
  if (!s) return fallback;
  if (['y', 'yes', 'true', '1', 'active'].includes(s)) return true;
  if (['n', 'no', 'false', '0', 'inactive'].includes(s)) return false;
  return null;
};
const errStyle = (msg) => (msg ? { borderColor: 'var(--danger)' } : undefined);
const checkboxStyle = { accentColor: 'var(--action)', width: 16, height: 16 };

const EMPTY_FORM = {
  packageName: PACKAGE_TIERS[0].name,
  durationMonths: 12,
  city: '',
  corporatePriceInclGst: '',
  mrp: '',
  platformFee: '80',
  gymAccess: [...PACKAGE_TIERS[0].access],
  inclusions: '',
  b2bExclusive: false,
  isActive: true,
};

/** Form / CSV values → the exact body the backend accepts. */
function toBody(f) {
  const t = tierByName(f.packageName);
  return {
    packageName: t ? t.name : String(f.packageName || '').trim(),
    tier: t ? t.code : '',
    durationMonths: Number(f.durationMonths),
    city: String(f.city || '').trim(),
    corporatePriceInclGst: num(f.corporatePriceInclGst),
    mrp: blank(f.mrp) ? null : num(f.mrp),
    platformFee: blank(f.platformFee) ? 80 : num(f.platformFee),
    gymAccess: (f.gymAccess || []).filter((g) => GYM_TYPES.includes(g)),
    inclusions: String(f.inclusions || '').trim(),
    b2bExclusive: Boolean(f.b2bExclusive),
    isActive: f.isActive !== false,
  };
}

/** Mirrors the backend rules (packageController + Package schema). */
function validate(b) {
  const e = {};
  if (!tierByName(b.packageName)) e.packageName = 'Select a valid package';
  if (!DURATIONS.includes(b.durationMonths)) e.durationMonths = 'Duration must be 1, 3, 6 or 12 months';
  if (!b.city) e.city = 'City is required';
  if (!Number.isFinite(b.corporatePriceInclGst) || b.corporatePriceInclGst < 0) e.corporatePriceInclGst = 'Enter a valid corporate price';
  if (b.mrp !== null) {
    if (!Number.isFinite(b.mrp) || b.mrp < 0) e.mrp = 'Enter a valid MRP or leave it blank';
    else if (Number.isFinite(b.corporatePriceInclGst) && b.mrp < b.corporatePriceInclGst) e.mrp = 'MRP cannot be lower than the corporate price';
  }
  if (!Number.isFinite(b.platformFee) || b.platformFee < 0) e.platformFee = 'Enter a valid platform fee';
  return e;
}

const sameSlot = (p, b) =>
  p.tier === b.tier && lc(p.city) === lc(b.city) && Number(p.durationMonths) === Number(b.durationMonths);

/* Small neutral chip for a gym network */
const NetChip = ({ code }) => (
  <span className="mr-1 inline-flex rounded-[999px] bg-[var(--surface-3)] px-[7px] py-[1px] text-[11px] font-bold leading-[17.05px] text-[var(--ink-2)]">
    {TIER_LABEL[code] || code}
  </span>
);

const TEMPLATE_COLUMNS = [
  { header: 'Package', key: 'packageName' },
  { header: 'Duration', key: 'durationMonths' },
  { header: 'City', key: 'city' },
  { header: 'Corporate price', key: 'corporatePriceInclGst' },
  { header: 'MRP', key: 'mrp' },
  { header: 'Platform fee', key: 'platformFee' },
  { header: 'Gym access', key: 'gymAccess' },
  { header: 'Inclusions', key: 'inclusions' },
  { header: 'B2B exclusive', key: 'b2bExclusive' },
  { header: 'Active', key: 'isActive' },
];

/* ── Page ────────────────────────────────────────────────────────────── */

export default function HrPackages({ crumbs }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  // Filters
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [pkg, setPkg] = useState('');
  const [status, setStatus] = useState('all');

  // Add / edit modal
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Bulk upload result
  const [report, setReport] = useState(null);

  useEffect(() => {
    let alive = true;
    packageService
      .getAllForHr()
      .then((res) => {
        if (!alive) return;
        setList(asList(res?.data, 'packages'));
        setError('');
      })
      .catch((err) => alive && setError(errText(err, 'Could not load packages')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  const cities = useMemo(
    () => [...new Set(list.map((p) => String(p.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [list]
  );

  const rows = useMemo(() => {
    const s = lc(q);
    return list
      .filter((p) => !city || p.city === city)
      .filter((p) => !pkg || p.tier === pkg)
      .filter((p) => status === 'all' || (status === 'active' ? p.isActive !== false : p.isActive === false))
      .filter((p) => !s || [p.packageName, p.city, p.inclusions].some((v) => lc(v).includes(s)))
      .sort(
        (a, b) =>
          String(a.city || '').localeCompare(String(b.city || '')) ||
          tierIndex(a.tier) - tierIndex(b.tier) ||
          Number(a.durationMonths) - Number(b.durationMonths)
      );
  }, [list, q, city, pkg, status]);

  /* Active toggle in the table — optimistic, reverted on error */
  const setActive = async (p, isActive) => {
    setList((l) => l.map((x) => (x._id === p._id ? { ...x, isActive } : x)));
    try {
      await packageService.update(p._id, { isActive });
      setError('');
      toast(isActive ? 'Package switched on' : 'Package switched off');
    } catch (err) {
      setList((l) => l.map((x) => (x._id === p._id ? { ...x, isActive: !isActive } : x)));
      setError(errText(err, 'Could not update the package'));
    }
  };

  /* ── Add / edit ── */
  const openAdd = () => {
    setErrors({});
    setForm({ ...EMPTY_FORM, gymAccess: [...EMPTY_FORM.gymAccess], city: city || '' });
  };
  const openEdit = (p) => {
    setErrors({});
    setForm({
      _id: p._id,
      packageName: p.packageName,
      durationMonths: Number(p.durationMonths) || 12,
      city: p.city || '',
      corporatePriceInclGst: p.corporatePriceInclGst ?? '',
      mrp: p.mrp ?? '',
      platformFee: p.platformFee ?? 80,
      gymAccess: Array.isArray(p.gymAccess) ? [...p.gymAccess] : [],
      inclusions: p.inclusions || '',
      b2bExclusive: Boolean(p.b2bExclusive),
      isActive: p.isActive !== false,
    });
  };
  const closeForm = () => !saving && setForm(null);
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pickPackage = (e) => {
    const t = tierByName(e.target.value);
    setForm((f) => ({ ...f, packageName: e.target.value, gymAccess: f._id || !t ? f.gymAccess : [...t.access] }));
  };
  const toggleNet = (code) =>
    setForm((f) => ({
      ...f,
      gymAccess: f.gymAccess.includes(code) ? f.gymAccess.filter((g) => g !== code) : GYM_TYPES.filter((g) => g === code || f.gymAccess.includes(g)),
    }));

  const save = async () => {
    const body = toBody(form);
    const e = validate(body);
    if (!Object.keys(e).length && list.some((p) => p._id !== form._id && sameSlot(p, body))) {
      e.form = `A ${body.packageName} package for ${body.city} · ${body.durationMonths} months already exists. Edit that one instead.`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (form._id) await packageService.update(form._id, body);
      else await packageService.create(body);
      setForm(null);
      toast(form._id ? 'Saved' : 'Package added');
      reload();
    } catch (err) {
      setErrors({ ...(err?.response?.data?.errors || {}), form: errText(err, 'Could not save the package') });
    } finally {
      setSaving(false);
    }
  };

  /* ── Bulk upload ── */
  const template = () =>
    downloadCsv('rate-card-template.csv', TEMPLATE_COLUMNS, [
      { packageName: 'cultpass ELITE', durationMonths: 12, city: 'Mumbai', corporatePriceInclGst: 15999, mrp: 24000, platformFee: 80, gymAccess: 'ELITE|PRO', inclusions: 'All ELITE + PRO gyms, unlimited group classes', b2bExclusive: 'N', isActive: 'Y' },
      { packageName: 'OnePass', durationMonths: 3, city: 'Pune', corporatePriceInclGst: 2999, mrp: '', platformFee: 80, gymAccess: 'ONEPASS', inclusions: 'Partner gyms across the city', b2bExclusive: 'Y', isActive: 'Y' },
    ]);

  const upload = async (file) => {
    let parsed;
    try {
      parsed = parseCsv(await readFileText(file));
    } catch (err) {
      setReport({ ok: false, message: errText(err, 'Could not read the file'), problems: [] });
      return;
    }
    if (!parsed.length) {
      setReport({ ok: false, message: 'The file has no data rows.', problems: [] });
      return;
    }

    // 1) Validate every row first; import nothing if any row fails.
    const problems = [];
    const bodies = [];
    const seen = new Map();
    parsed.forEach((r) => {
      const t = tierByName(r.package || r.packagename) || PACKAGE_TIERS.find((x) => lc(x.code) === lc(r.package || r.tier));
      const tokens = String(r.gymaccess || '')
        .split(/[|,;/+]+/)
        .map((s) => s.trim().toUpperCase().replace(/\s+/g, ''))
        .filter(Boolean);
      const badNets = tokens.filter((s) => !GYM_TYPES.includes(s));
      const b2b = yn(r.b2bexclusive || r.b2b, false);
      const active = yn(r.active || r.activeyn, true);
      const body = toBody({
        packageName: t ? t.name : r.package || r.packagename || '',
        durationMonths: parseInt(String(r.duration || r.durationmonths || '').replace(/[^0-9]/g, ''), 10),
        city: r.city,
        corporatePriceInclGst: r.corporateprice || r.corporatepriceinclgst || r.price,
        mrp: r.mrp,
        platformFee: r.platformfee,
        gymAccess: tokens.length ? tokens : t ? t.access : [],
        inclusions: r.inclusions,
        b2bExclusive: b2b,
        isActive: active,
      });
      const e = validate(body);
      if (!t) e.packageName = `Package must be one of: ${PACKAGE_TIERS.map((x) => x.name).join(', ')}`;
      if (badNets.length) e.gymAccess = `Gym access must be ELITE, PRO or ONEPASS (found ${badNets.join(', ')})`;
      if (b2b === null) e.b2bExclusive = 'B2B exclusive must be Y or N';
      if (active === null) e.isActive = 'Active must be Y or N';
      if (!Object.keys(e).length) {
        const key = `${body.tier}|${lc(body.city)}|${body.durationMonths}`;
        if (seen.has(key)) e.duplicate = `Duplicate of row ${seen.get(key)}`;
        else seen.set(key, r.__row);
      }
      if (Object.keys(e).length) problems.push({ id: problems.length, row: r.__row, issue: Object.values(e).join('; ') });
      else bodies.push({ row: r.__row, body });
    });
    if (problems.length) {
      setReport({ ok: false, message: `${problems.length} row(s) have errors. Nothing was imported.`, problems });
      return;
    }

    // 2) Upsert one by one: tier + city + duration match → update, else create.
    let created = 0;
    let updated = 0;
    const failed = [];
    for (const { row, body } of bodies) {
      const existing = list.find((p) => sameSlot(p, body));
      try {
        if (existing) {
          await packageService.update(existing._id, body);
          updated += 1;
        } else {
          await packageService.create(body);
          created += 1;
        }
      } catch (err) {
        const fe = err?.response?.data?.errors;
        failed.push({ id: failed.length, row, issue: fe ? Object.values(fe).join('; ') : errText(err, 'Could not save') });
      }
    }
    setReport({
      ok: !failed.length,
      message: `Rate card imported: ${created} new, ${updated} updated, ${failed.length} failed.`,
      problems: failed,
    });
    reload();
  };

  /* ── Table ── */
  const columns = [
    {
      key: 'package',
      header: 'Package',
      width: '17%',
      sortValue: (p) => tierIndex(p.tier),
      title: (p) => p.packageName,
      render: (p) => (
        <span className="inline-flex items-center gap-2">
          <TierBadge tier={p.tier} />
          <span className="truncate text-[var(--ink-2)]">{p.packageName}</span>
        </span>
      ),
    },
    { key: 'durationMonths', header: 'Duration', width: '7%', sortValue: (p) => Number(p.durationMonths), render: (p) => `${p.durationMonths} m` },
    { key: 'city', header: 'City', width: '9%', sortValue: (p) => p.city || '' },
    {
      key: 'mrp',
      header: 'MRP',
      width: '8%',
      align: 'right',
      sortValue: (p) => (p.mrp === null || p.mrp === undefined ? null : Number(p.mrp)),
      render: (p) => (p.mrp === null || p.mrp === undefined || p.mrp === '' ? null : inr(p.mrp)),
    },
    {
      key: 'corporatePriceInclGst',
      header: 'Corporate price (incl. GST)',
      width: '11%',
      align: 'right',
      sortValue: (p) => Number(p.corporatePriceInclGst) || 0,
      title: (p) => inr(p.corporatePriceInclGst),
      render: (p) => <span className="font-bold text-[var(--ink)]">{inr(p.corporatePriceInclGst)}</span>,
    },
    {
      key: 'platformFee',
      header: 'Platform fee',
      width: '8%',
      align: 'right',
      sortValue: (p) => Number(p.platformFee ?? 80),
      render: (p) => inr(p.platformFee ?? 80),
    },
    {
      key: 'gymAccess',
      header: 'Gym access',
      width: '13%',
      title: (p) => (p.gymAccess || []).map((g) => TIER_LABEL[g] || g).join(', '),
      render: (p) => (p.gymAccess?.length ? p.gymAccess.map((g) => <NetChip key={g} code={g} />) : null),
    },
    {
      key: 'inclusions',
      header: 'Inclusions',
      width: '15%',
      wrap: true,
      title: (p) => p.inclusions || '',
      render: (p) => (p.inclusions ? <span className="text-[12px]">{p.inclusions}</span> : null),
    },
    {
      key: 'isActive',
      header: 'Active',
      width: '6%',
      align: 'center',
      sortValue: (p) => (p.isActive === false ? 1 : 0),
      title: (p) => (p.isActive === false ? 'Inactive' : 'Active'),
      render: (p) => (
        <Toggle checked={p.isActive !== false} onChange={(v) => setActive(p, v)} label={`${p.packageName} ${p.city} ${p.durationMonths} months active`} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '6%',
      align: 'center',
      title: () => 'Edit',
      render: (p) => <IconButton icon={EditOutlined} label="Edit package" onClick={() => openEdit(p)} />,
    },
  ];

  const resetKey = [q, city, pkg, status].join('|');

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Packages & Pricing" />

      <div className={`${card} flex flex-wrap items-end gap-[10px]`} style={{ padding: 12 }}>
        <div>
          <label htmlFor="hr-pkg-deduction" className={labelCls}>
            Fixed payroll deduction period (applies to all)
          </label>
          <input id="hr-pkg-deduction" className={input} style={{ width: 200 }} value={`${DEDUCTION_MONTHS} months`} disabled readOnly />
        </div>
        <span className="mb-2">
          <GstPill>Prices entered incl. GST</GstPill>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${btn.primary}${btn.sm}`} onClick={openAdd}>
          <AddOutlined sx={{ fontSize: 14 }} /> Add package
        </button>
        <FileButton className={`${btn.secondary}${btn.sm}`} onFile={upload}>
          Bulk upload rate card (CSV)
        </FileButton>
        <button type="button" className={`${exportBtn}${btn.sm}`} onClick={template}>
          <TableViewOutlined sx={{ fontSize: 14 }} /> Download template
        </button>
      </div>
      <Note>
        Template columns: Package ({PACKAGE_TIERS.map((t) => t.name).join(' / ')}) · Duration (1 / 3 / 6 / 12) · City · Corporate price (incl. GST) ·
        MRP (optional) · Platform fee (blank = ₹80) · Gym access (e.g. ELITE|PRO) · Inclusions · B2B exclusive (Y/N) · Active (Y/N). Every row is
        checked before anything is imported. A row with the same package, city and duration as an existing package updates it; any other row adds a new package.
      </Note>

      <div className="grid gap-[10px] md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-2)' }} />
          <input className={`${input} pl-9`} placeholder="Search package, city or inclusions" aria-label="Search packages" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={input} aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={input} aria-label="Package" value={pkg} onChange={(e) => setPkg(e.target.value)}>
          <option value="">All packages</option>
          {PACKAGE_TIERS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
        <select className={input} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Banner onRetry={list.length ? undefined : reload}>{error}</Banner>

      {loading ? (
        <Spinner label="Loading packages…" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p._id}
          minWidth={1150}
          resetKey={resetKey}
          empty={list.length ? 'No packages match these filters.' : 'No packages yet. Add one or upload the rate card.'}
        />
      )}

      {/* Add / edit package */}
      <Modal
        open={!!form}
        onClose={closeForm}
        title={form?._id ? 'Edit package' : 'Add package'}
        size="lg"
        icon={Inventory2Outlined}
        footer={
          <>
            <button type="button" className={btn.primary} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={btn.text} onClick={closeForm}>
              Cancel
            </button>
          </>
        }
      >
        {form && (
          <>
            <Banner>{errors.form}</Banner>
            <div className="grid gap-x-[18px] gap-y-[14px] py-2 sm:grid-cols-2">
              <Field label="Package" required error={errors.packageName || errors.tier}>
                <select data-autofocus className={input} style={errStyle(errors.packageName || errors.tier)} value={form.packageName} onChange={pickPackage} aria-label="Package">
                  {!tierByName(form.packageName) && <option value={form.packageName}>{form.packageName || 'Select a package'}</option>}
                  {PACKAGE_TIERS.map((t) => (
                    <option key={t.code} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duration" required error={errors.durationMonths}>
                <select className={input} style={errStyle(errors.durationMonths)} value={form.durationMonths} onChange={setField('durationMonths')} aria-label="Duration">
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} month{d > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City" required error={errors.city}>
                <input className={input} style={errStyle(errors.city)} list="hr-pkg-cities" value={form.city} onChange={setField('city')} aria-label="City" placeholder="e.g. Mumbai" />
                <datalist id="hr-pkg-cities">
                  {cities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Corporate price incl. GST (₹)" required error={errors.corporatePriceInclGst}>
                <input
                  type="number"
                  min="0"
                  className={input}
                  style={errStyle(errors.corporatePriceInclGst)}
                  value={form.corporatePriceInclGst}
                  onChange={setField('corporatePriceInclGst')}
                  aria-label="Corporate price incl. GST"
                />
              </Field>
              <Field label="MRP (₹)" error={errors.mrp} hint="Optional. Must not be lower than the corporate price.">
                <input type="number" min="0" className={input} style={errStyle(errors.mrp)} value={form.mrp} onChange={setField('mrp')} aria-label="MRP" />
              </Field>
              <Field label="Platform fee (₹)" error={errors.platformFee} hint="Charged per user on top of the price.">
                <input type="number" min="0" className={input} style={errStyle(errors.platformFee)} value={form.platformFee} onChange={setField('platformFee')} aria-label="Platform fee" />
              </Field>
              <Field label="Gym access" error={errors.gymAccess} className="sm:col-span-2">
                <div className="flex flex-wrap gap-x-[18px] gap-y-2 pt-1">
                  {GYM_TYPES.map((g) => (
                    <label key={g} className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
                      <input type="checkbox" style={checkboxStyle} checked={form.gymAccess.includes(g)} onChange={() => toggleNet(g)} />
                      {TIER_LABEL[g] || g} gyms
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Inclusions" error={errors.inclusions} className="sm:col-span-2">
                <input className={input} style={errStyle(errors.inclusions)} value={form.inclusions} onChange={setField('inclusions')} aria-label="Inclusions" placeholder="e.g. Unlimited group classes, online workouts" />
              </Field>
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="hr-pkg-b2b"
                  type="checkbox"
                  style={checkboxStyle}
                  checked={form.b2bExclusive}
                  onChange={(e) => setForm((f) => ({ ...f, b2bExclusive: e.target.checked }))}
                />
                <label htmlFor="hr-pkg-b2b" className="text-[13px] text-[var(--ink-2)]">
                  B2B exclusive (corporate-only package)
                </label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Active" />
                <span className="text-[13px] text-[var(--ink-2)]">{form.isActive ? 'Active · shown to employees' : 'Inactive · hidden from employees'}</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Bulk upload result */}
      <Modal
        open={!!report}
        onClose={() => setReport(null)}
        title="Rate card upload"
        size="lg"
        icon={Inventory2Outlined}
        footer={
          <button type="button" className={btn.primary} onClick={() => setReport(null)}>
            Done
          </button>
        }
      >
        {report && (
          <>
            <Banner type={report.ok ? 'success' : 'error'}>{report.message}</Banner>
            {report.problems.length > 0 && (
              <div className="pb-2">
                <DataTable
                  columns={[
                    { key: 'row', header: 'CSV row', width: '15%', sortValue: (p) => Number(p.row) || 0 },
                    { key: 'issue', header: 'Issue', width: '85%', wrap: true },
                  ]}
                  rows={report.problems}
                  rowKey={(p) => p.id}
                  minWidth={0}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
