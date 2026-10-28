import { useEffect, useMemo, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { gymService } from '../../services/api';
import { downloadCsv, parseCsv, readFileText } from '../../lib/csv';
import { GYM_TYPES, TIER_LABEL, asList, errText, normaliseGym, openMaps } from '../../lib/wellness';
import {
  Banner,
  Field,
  FileButton,
  IconButton,
  Modal,
  Note,
  PageHeader,
  Spinner,
  TierBadge,
  Toggle,
  btn,
  exportBtn,
  input,
  useToast,
} from '../../components/ui';
import DataTable from '../../components/DataTable';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const MAX_ROWS = 5000;
const lc = (v) => String(v ?? '').trim().toLowerCase();
const isHttps = (v) => /^https:\/\//i.test(String(v || '').trim());
const errStyle = (msg) => (msg ? { borderColor: 'var(--danger)' } : undefined);
/** Y/N cell → boolean; blank → true; anything else → null (invalid). */
const yn = (v) => {
  const s = lc(v);
  if (!s) return true;
  if (['y', 'yes', 'true', '1', 'active'].includes(s)) return true;
  if (['n', 'no', 'false', '0', 'inactive'].includes(s)) return false;
  return null;
};

const EMPTY_FORM = { gymName: '', type: 'ELITE', centerType: '', area: '', city: '', address: '', timings: '', googleMapsLink: '', isActive: true };

/** Form / CSV values → the body the backend accepts. */
const toBody = (f) => ({
  gymName: String(f.gymName || '').trim(),
  type: String(f.type || '').toUpperCase().replace(/\s+/g, ''),
  centerType: String(f.centerType || '').trim(),
  area: String(f.area || '').trim(),
  city: String(f.city || '').trim(),
  address: String(f.address || '').trim(),
  timings: String(f.timings || '').trim(),
  googleMapsLink: String(f.googleMapsLink || '').trim(),
  isActive: f.isActive !== false,
});

/** Mirrors the backend rules (gymController.checkGym). */
function validate(g) {
  const e = {};
  if (!g.gymName) e.gymName = 'Gym name is required';
  if (!GYM_TYPES.includes(g.type)) e.type = 'Type must be ELITE, PRO or ONEPASS';
  if (!g.city) e.city = 'City is required';
  if (g.googleMapsLink && !isHttps(g.googleMapsLink)) e.googleMapsLink = 'Maps link must start with https://';
  return e;
}

const TEMPLATE_COLUMNS = [
  { header: 'Gym name', key: 'gymName' },
  { header: 'Type', key: 'type' },
  { header: 'Centre type', key: 'centerType' },
  { header: 'Area', key: 'area' },
  { header: 'City', key: 'city' },
  { header: 'Address', key: 'address' },
  { header: 'Timings', key: 'timings' },
  { header: 'Google Maps link', key: 'googleMapsLink' },
  { header: 'Active', key: 'active' },
];

/* ── Page ────────────────────────────────────────────────────────────── */

export default function HrGyms({ crumbs }) {
  const toast = useToast();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  // Filters
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('all');

  // Add / edit modal
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Bulk upload result
  const [report, setReport] = useState(null);

  // Load the whole Gym Master once (incl. inactive); filters run client-side.
  useEffect(() => {
    let alive = true;
    gymService
      .getGymsForHr()
      .then((res) => {
        if (!alive) return;
        setGyms(asList(res?.data, 'gyms').map(normaliseGym));
        setError('');
      })
      .catch((err) => alive && setError(errText(err, 'Could not load the gym list')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  const cityCounts = useMemo(() => {
    const m = new Map();
    gyms.forEach((g) => {
      const c = String(g.city || '').trim();
      if (c) m.set(c, (m.get(c) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [gyms]);

  const rows = useMemo(() => {
    const s = lc(q);
    return gyms.filter(
      (g) =>
        (!city || g.city === city) &&
        (!type || g.type === type) &&
        (status === 'all' || (status === 'active' ? g.isActive !== false : g.isActive === false)) &&
        (!s || [g.name, g.area, g.address].some((v) => lc(v).includes(s)))
    );
  }, [gyms, q, city, type, status]);

  /* Active toggle in the table — optimistic, reverted on error */
  const setActive = async (g, isActive) => {
    setGyms((l) => l.map((x) => (x._id === g._id ? { ...x, isActive } : x)));
    try {
      await gymService.update(g._id, { isActive });
      setError('');
      toast(isActive ? 'Gym switched on' : 'Gym switched off');
    } catch (err) {
      setGyms((l) => l.map((x) => (x._id === g._id ? { ...x, isActive: !isActive } : x)));
      setError(errText(err, 'Could not update the gym'));
    }
  };

  /* ── Add / edit ── */
  const openAdd = () => {
    setErrors({});
    setForm({ ...EMPTY_FORM, city: city || '', type: type || 'ELITE' });
  };
  const openEdit = (g) => {
    setErrors({});
    setForm({
      _id: g._id,
      gymName: g.gymName || g.name || '',
      type: GYM_TYPES.includes(g.type) ? g.type : 'ELITE',
      centerType: g.centerType || '',
      area: g.area || '',
      city: g.city || '',
      address: g.address || '',
      timings: g.timings || '',
      googleMapsLink: g.googleMapsLink || g.mapsUrl || '',
      isActive: g.isActive !== false,
    });
  };
  const closeForm = () => !saving && setForm(null);
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const body = toBody(form);
    const e = validate(body);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (form._id) await gymService.update(form._id, body);
      else await gymService.create(body);
      setForm(null);
      toast(form._id ? 'Saved' : 'Gym added');
      reload();
    } catch (err) {
      setErrors({ ...(err?.response?.data?.errors || {}), form: errText(err, 'Could not save the gym') });
    } finally {
      setSaving(false);
    }
  };

  /* ── Bulk upload ── */
  const template = () =>
    downloadCsv('gym-master-template.csv', TEMPLATE_COLUMNS, [
      {
        gymName: 'cult Kurla West',
        type: 'ELITE',
        centerType: 'Cult Center',
        area: 'Kurla West',
        city: 'Mumbai',
        address: 'LBS Marg, Kurla West, Mumbai',
        timings: '6 AM – 10 PM',
        googleMapsLink: 'https://maps.google.com/?q=cult+Kurla+West',
        active: 'Y',
      },
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
    if (parsed.length > MAX_ROWS) {
      setReport({ ok: false, message: `Upload at most ${MAX_ROWS.toLocaleString('en-IN')} gyms at a time (this file has ${parsed.length.toLocaleString('en-IN')}).`, problems: [] });
      return;
    }

    // Check every row (required fields, links, duplicates) before sending anything.
    const problems = [];
    const clean = [];
    const seen = new Map();
    parsed.forEach((r) => {
      const active = yn(r.active ?? r.activeyn);
      const g = toBody({
        gymName: r.gymname || r.gymcentre || r.gym || r.name || r.centre || '',
        type: r.type || r.businessline || '',
        centerType: r.centretype || r.centertype || '',
        area: r.area || r.locality || '',
        city: r.city || '',
        address: r.address || '',
        timings: r.timings || r.hours || '',
        googleMapsLink: r.googlemapslink || r.mapslink || r.maps || r.link || '',
        isActive: active !== false,
      });
      const e = validate(g);
      if (active === null) e.isActive = 'Active must be Y or N';
      const key = `${lc(g.gymName)}|${lc(g.city)}`;
      if (g.gymName && g.city) {
        if (seen.has(key)) e.duplicate = `Duplicate of row ${seen.get(key)} (same gym name and city)`;
        else seen.set(key, r.__row);
      }
      if (Object.keys(e).length) problems.push({ id: problems.length, row: r.__row, issue: Object.values(e).join('; ') });
      else clean.push(g);
    });
    if (problems.length) {
      setReport({ ok: false, message: `${problems.length} row(s) have errors. Nothing was imported.`, problems });
      return;
    }

    try {
      const res = await gymService.bulkUpload(clean);
      const d = res?.data || {};
      setReport({ ok: true, message: d.message || `Imported ${clean.length} gym centres.`, problems: [] });
      reload();
    } catch (err) {
      const list = Array.isArray(err?.response?.data?.problems) ? err.response.data.problems : [];
      setReport({
        ok: false,
        message: errText(err, 'Upload failed. Nothing was imported.'),
        problems: list.map((p, i) => ({ id: i, row: p.row, issue: p.issue })),
      });
    }
  };

  /* ── Table ── */
  const columns = [
    {
      key: 'name',
      header: 'Gym / Centre',
      width: '18%',
      sortValue: (g) => lc(g.name),
      title: (g) => g.name,
      render: (g) => <span className="font-bold text-[var(--ink)]">{g.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '9%',
      sortValue: (g) => g.type,
      title: (g) => TIER_LABEL[g.type] || g.type,
      render: (g) => (g.type ? <TierBadge tier={g.type} /> : null),
    },
    { key: 'area', header: 'Area', width: '12%', sortValue: (g) => lc(g.area) },
    { key: 'city', header: 'City', width: '10%', sortValue: (g) => lc(g.city) },
    {
      key: 'address',
      header: 'Address',
      width: '27%',
      wrap: true,
      title: (g) => g.address || '',
      render: (g) => (g.address ? <span className="text-[12px]">{g.address}</span> : null),
    },
    {
      key: 'maps',
      header: 'Maps link',
      width: '8%',
      title: (g) => g.mapsUrl || 'No link saved: opens a Google Maps search',
      render: (g) => (
        <button
          type="button"
          onClick={() => openMaps(g)}
          className="text-[12px] font-bold text-[var(--action)] transition-colors duration-[120ms] hover:text-[var(--action-hover)] hover:underline"
          aria-label={`Open ${g.name} in Google Maps`}
        >
          Open
        </button>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      width: '8%',
      align: 'center',
      sortValue: (g) => (g.isActive === false ? 1 : 0),
      title: (g) => (g.isActive === false ? 'Inactive' : 'Active'),
      render: (g) => <Toggle checked={g.isActive !== false} onChange={(v) => setActive(g, v)} label={`${g.name} active`} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '8%',
      align: 'center',
      title: () => 'Edit',
      render: (g) => <IconButton icon={EditOutlined} label="Edit gym" onClick={() => openEdit(g)} />,
    },
  ];

  const resetKey = [q, city, type, status].join('|');

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Gym Master" />

      <div className="flex flex-wrap items-center gap-2">
        <FileButton className={`${btn.primary}${btn.sm}`} onFile={upload}>
          Bulk upload gym list (CSV)
        </FileButton>
        <button type="button" className={`${exportBtn}${btn.sm}`} onClick={template}>
          <TableViewOutlined sx={{ fontSize: 14 }} /> Download template
        </button>
        <button type="button" className={`${btn.secondary}${btn.sm}`} onClick={openAdd}>
          <AddOutlined sx={{ fontSize: 14 }} /> Add gym
        </button>
      </div>
      <Note>
        Template columns: Gym name · Type (ELITE / PRO / ONEPASS) · Area · City · Address · Timings · Google Maps link · Active (Y/N). Uploads are checked
        for duplicate rows and invalid links. This list feeds the employee Gym Locator, the centre count and the preferred-centre dropdown.
      </Note>

      <div className="grid gap-[10px] md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-2)' }} />
          <input className={`${input} pl-9`} placeholder="Search name, area or address" aria-label="Search gyms" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={input} aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities ({gyms.length})</option>
          {cityCounts.map(([c, n]) => (
            <option key={c} value={c}>
              {c} ({n})
            </option>
          ))}
        </select>
        <select className={input} aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {GYM_TYPES.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t] || t}
            </option>
          ))}
        </select>
        <select className={input} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Banner onRetry={gyms.length ? undefined : reload}>{error}</Banner>

      {loading ? (
        <Spinner label="Loading gyms…" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(g) => g._id}
          minWidth={1000}
          resetKey={resetKey}
          empty={gyms.length ? 'No gyms match these filters.' : 'No gyms yet. Upload the gym list or add a gym.'}
        />
      )}

      {/* Add / edit gym */}
      <Modal
        open={!!form}
        onClose={closeForm}
        title={form?._id ? 'Edit gym' : 'Add gym'}
        size="lg"
        icon={PlaceOutlined}
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
              <Field label="Gym name" required error={errors.gymName}>
                <input data-autofocus className={input} style={errStyle(errors.gymName)} value={form.gymName} onChange={setField('gymName')} aria-label="Gym name" />
              </Field>
              <Field label="Type" required error={errors.type}>
                <select className={input} style={errStyle(errors.type)} value={form.type} onChange={setField('type')} aria-label="Type">
                  {GYM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABEL[t] || t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centre type" error={errors.centerType} hint="e.g. GYM or Cult Center">
                <input className={input} style={errStyle(errors.centerType)} value={form.centerType} onChange={setField('centerType')} aria-label="Centre type" />
              </Field>
              <Field label="Area" error={errors.area}>
                <input className={input} style={errStyle(errors.area)} value={form.area} onChange={setField('area')} aria-label="Area" />
              </Field>
              <Field label="City" required error={errors.city}>
                <input className={input} style={errStyle(errors.city)} list="hr-gym-cities" value={form.city} onChange={setField('city')} aria-label="City" />
                <datalist id="hr-gym-cities">
                  {cityCounts.map(([c]) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Timings" error={errors.timings}>
                <input className={input} style={errStyle(errors.timings)} value={form.timings} onChange={setField('timings')} aria-label="Timings" placeholder="e.g. 6 AM – 10 PM" />
              </Field>
              <Field label="Address" error={errors.address} className="sm:col-span-2">
                <input className={input} style={errStyle(errors.address)} value={form.address} onChange={setField('address')} aria-label="Address" />
              </Field>
              <Field label="Google Maps link" error={errors.googleMapsLink} hint="Must start with https://" className="sm:col-span-2">
                <input
                  className={input}
                  style={errStyle(errors.googleMapsLink)}
                  value={form.googleMapsLink}
                  onChange={setField('googleMapsLink')}
                  aria-label="Google Maps link"
                  placeholder="https://maps.google.com/…"
                />
              </Field>
              <div className="flex items-center gap-2 pt-1">
                <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Active" />
                <span className="text-[13px] text-[var(--ink-2)]">{form.isActive ? 'Active · shown in the Gym Locator' : 'Inactive · hidden from employees'}</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Bulk upload result */}
      <Modal
        open={!!report}
        onClose={() => setReport(null)}
        title="Gym list upload"
        size="lg"
        icon={PlaceOutlined}
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
