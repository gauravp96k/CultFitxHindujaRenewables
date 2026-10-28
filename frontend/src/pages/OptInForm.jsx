import { useEffect, useMemo, useState } from 'react';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { downloadAcknowledgement } from '../lib/acknowledgement';
import { gymService, requestService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DEDUCTION_MONTHS, GYM_TYPES_FOR, POLICY_VERSION, asList, errText, fmtDate, inr, isRealId, months,
  normaliseGym, userEmpId, userLocation, userName,
} from '../lib/wellness';
import { Banner, Field, GstPill, btn, card, input } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';

/* HREPL work locations shown in the dropdown — edit this list to match your offices / sites. */
const WORK_LOCATIONS = [
  'Mumbai – Head Office',
  'Bengaluru',
  'Chennai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Project Site / Plant',
];
/** Choosing this location asks for the plant / site name in a separate field. */
const PLANT_SITE = 'Project Site / Plant';
const PLANT_PREFIX = 'Plant / Site: ';
/** "Plant / Site: Jaisalmer" → { location: PLANT_SITE, site: 'Jaisalmer' } (for pre-filling). */
const splitLocation = (v) =>
  String(v || '').startsWith(PLANT_PREFIX) ? { location: PLANT_SITE, site: String(v).slice(PLANT_PREFIX.length) } : { location: v || '', site: '' };
/** Letters, digits, spaces and . , ' ( ) / - only, up to 60 characters. */
const toSite = (value) => String(value || '').replace(/[^A-Za-z0-9 .,'()/-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 60);

/* Full policy PDF (same file as the Policy tab) */
const POLICY_PDF_URL = '/policy/HREPL-Corporate-Gym-Membership-Policy.pdf';

/* ── Input rules ── */
const MOBILE_RX = /^[6-9]\d{9}$/; // 10 digits, Indian mobile
const NAME_RX = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const EMP_ID_RX = /^[A-Z0-9][A-Z0-9-]{1,19}$/; // must match the backend rule
/** Uppercase letters, digits and hyphens only, up to 20 characters. */
const toEmpId = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
const cleanPhone = (v) => String(v || '').replace(/\D/g, '');
const today = () => new Date().toISOString().slice(0, 10);

/** Keeps digits only, drops a pasted +91 / 0 prefix, and never allows more than 10 digits. */
function toMobile(value) {
  let d = String(value || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}
/** Letters, spaces and . ' - only, up to 50 characters. */
const toName = (value) => String(value || '').replace(/[^A-Za-z .'-]/g, '').replace(/\s{2,}/g, ' ').slice(0, 50);

/** Stops non-digit keys before they reach the field (paste is cleaned by toMobile). */
const digitsOnlyKey = (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return; // shortcuts, Backspace, arrows, Tab…
  if (!/\d/.test(e.key)) e.preventDefault();
};

/** Opens the full policy PDF in a new tab without ticking the checkbox it sits next to. */
const openPolicy = (e) => {
  e.preventDefault();
  e.stopPropagation();
  window.open(POLICY_PDF_URL, '_blank', 'noopener,noreferrer');
};

/** Phone field with a separate "+91" box beside the input, so the digits never sit under the prefix. */
function PhoneInput({ id, value, onChange, invalid, autoComplete = 'off' }) {
  return (
    <div
      className="flex w-full items-stretch overflow-hidden rounded-[10px] border bg-[var(--surface)] transition-colors duration-[120ms]"
      style={{
        borderColor: invalid ? 'var(--danger)' : 'var(--line)',
      }}
    >
      <span className="flex shrink-0 select-none items-center border-r border-[var(--line)] bg-[var(--surface-2)] px-3 text-[13px] text-[var(--muted)]">
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={10}
        placeholder="10-digit mobile number"
        value={value}
        onKeyDown={digitsOnlyKey}
        onChange={onChange}
        aria-invalid={invalid ? true : undefined}
        className="w-full min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-[13px] tracking-wide text-[var(--ink)] outline-none placeholder:text-[var(--muted-2)]"
      />
    </div>
  );
}

const DECLARATIONS = [
  {
    key: 'policy',
    text: () => (
      <>
        I have read and accept the{' '}
        <button type="button" onClick={openPolicy} className="inline-flex items-center gap-0.5 font-semibold text-[var(--action)] underline hover:text-[var(--action-hover)]">
          Corporate Wellness Policy {POLICY_VERSION}
          <OpenInNewOutlined sx={{ fontSize: 12 }} aria-hidden="true" />
        </button>
        .
      </>
    ),
  },
  { key: 'dataSharing', text: 'I agree to share my name, mobile and email with Cult.fit for activation.' },
  { key: 'payroll', text: (p) => `I authorise HREPL payroll deduction of ${inr(p.monthlyDeduction)} per month for ${DEDUCTION_MONTHS} months (total ${inr(p.corporatePrice)}).` },
  { key: 'medical', text: 'I confirm that I am fit to participate and have received the necessary clearance from a medical practitioner.' },
];

function PlanSummary({ p, refId, createdAt }) {
  const hasMrp = Number(p.mrp) > Number(p.corporatePrice); // the rate card has no MRP yet, so hide ₹0 rows
  const rows = [
    refId && ['Reference ID', <b key="r">{refId}</b>],
    ['Package', <b key="p">{p.packageName}</b>],
    ['Duration', months(p.durationMonths)],
    ['City', p.city || '—'],
    hasMrp && ['MRP', <s key="m" className="text-[var(--muted-2)]">{inr(p.mrp)}</s>],
    ['Corporate price', <span key="c" className="inline-flex items-center gap-2"><b className="text-base text-[var(--brand)]">{inr(p.corporatePrice)}</b> <GstPill>incl. GST</GstPill></span>],
    hasMrp && ['You save', `${inr(p.savings)} (${p.discountPct}%)`],
    ['Effective / month', inr(p.perMonth)],
    ['Inclusions', p.inclusions || '—'],
    ['Payroll deduction', `${inr(p.monthlyDeduction)} × ${DEDUCTION_MONTHS} months (fixed)`],
    createdAt && ['Request date', fmtDate(createdAt)],
  ].filter(Boolean);
  return (
    <dl className="divide-y divide-[var(--line-soft)] text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[45%_1fr] gap-2 py-1.5">
          <dt className="text-[var(--muted)]">{k}</dt>
          <dd className="text-[var(--ink)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const EMPTY = {
  employeeId: '',
  workLocation: '',
  mobileOnCultApp: '',
  gender: '',
  dateOfBirth: '',
  isExistingMember: 'No',
  emergencyContactName: '',
  emergencyContactNumber: '',
  preferredCentre: '',
  preferredStartDate: '',
  healthCondition: '',
  remarks: '',
};

export default function OptInForm({ activePackage, setCurrentView }) {
  const { user } = useAuth();
  const p = activePackage || {};
  // Work location starts with the location from login (if any); the employee can change it.
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    employeeId: userEmpId(user) || '',
    workLocation: splitLocation(userLocation(user)).location,
    plantSite: splitLocation(userLocation(user)).site,
  }));
  const [declared, setDeclared] = useState({ policy: false, dataSharing: false, payroll: false, medical: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gyms, setGyms] = useState([]);
  const [done, setDone] = useState(null); // { refId, createdAt }

  // Gym networks this package gives access to. Prefer the package's own gymAccess list
  // (e.g. ['PRO','ONEPASS']); fall back to the tier map for older/sample packages.
  const allowedTypes = useMemo(() => {
    const own = Array.isArray(p.gymAccess) ? p.gymAccess.map((t) => String(t).toUpperCase()).filter(Boolean) : [];
    return own.length ? own : GYM_TYPES_FOR[p.tier] || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p._id, p.tier]);
  // Loading until the centre list for the package's city arrives (the city is fixed for this form).
  const [gymsLoading, setGymsLoading] = useState(() => Boolean(p.city));

  // If the employee's own location is not in the list, show it as the first option.
  const locationOptions = useMemo(() => {
    const own = splitLocation(userLocation(user)).location;
    return own && !WORK_LOCATIONS.includes(own) ? [own, ...WORK_LOCATIONS] : WORK_LOCATIONS;
  }, [user]);

  useEffect(() => {
    if (!p.city) return undefined;
    let alive = true;
    gymService
      .getGyms({ city: p.city })
      .then((res) => alive && setGyms(asList(res?.data, 'gyms').map(normaliseGym)))
      .catch(() => alive && setGyms([]))
      .finally(() => alive && setGymsLoading(false));
    return () => {
      alive = false;
    };
  }, [p.city]);

  // Centres in the package's city that the package covers (all city centres if the
  // package lists no networks), sorted by name for the dropdown.
  const centres = useMemo(() => {
    const list = allowedTypes.length ? gyms.filter((g) => allowedTypes.includes(g.type)) : gyms;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [gyms, allowedTypes]);

  // Options for the searchable centre dropdown (value = gym name, as before).
  const centreOptions = useMemo(() => {
    const seen = new Set();
    return centres
      .filter((g) => (seen.has(g.name) ? false : seen.add(g.name)))
      .map((g) => ({ value: g.name, label: g.name, secondary: [g.area, g.type].filter(Boolean).join(' · ') }));
  }, [centres]);

  // Updates a field and clears its error as soon as the user corrects it.
  const update = (k, value) => {
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const set = (k) => (e) => update(k, e.target.value);
  const setMobile = (k) => (e) => update(k, toMobile(e.target.value));
  const setName = (k) => (e) => update(k, toName(e.target.value));
  const allDeclared = Object.values(declared).every(Boolean);
  // What is saved as the work location: the plant / site name replaces the generic option.
  const fullLocation = form.workLocation === PLANT_SITE ? `${PLANT_PREFIX}${form.plantSite.trim()}` : form.workLocation;

  const validate = () => {
    const e = {};
    const mobile = cleanPhone(form.mobileOnCultApp);
    const emergency = cleanPhone(form.emergencyContactNumber);
    if (!form.employeeId) e.employeeId = 'Enter your employee ID';
    else if (!EMP_ID_RX.test(form.employeeId)) e.employeeId = 'Use 2–20 letters, numbers or hyphens';
    if (!form.workLocation) e.workLocation = 'Select your work location';
    else if (form.workLocation === PLANT_SITE && form.plantSite.trim().length < 2) e.plantSite = 'Enter the plant / site name';
    if (!mobile) e.mobileOnCultApp = 'Enter your mobile number';
    else if (mobile.length !== 10) e.mobileOnCultApp = 'Mobile number must be exactly 10 digits';
    else if (!MOBILE_RX.test(mobile)) e.mobileOnCultApp = 'Enter a valid mobile number starting with 6, 7, 8 or 9';
    if (!form.gender) e.gender = 'Select gender';
    if (!form.dateOfBirth) e.dateOfBirth = 'Enter date of birth';
    else {
      const age = (Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 864e5);
      if (age < 18) e.dateOfBirth = 'You must be at least 18 years old';
    }
    // Emergency contact is optional; whatever is entered must still be valid.
    const name = form.emergencyContactName.trim();
    if (name && !NAME_RX.test(name)) e.emergencyContactName = 'Use letters only (at least 2 characters)';
    if (!emergency) {
      /* optional */
    } else if (emergency.length !== 10) e.emergencyContactNumber = 'Mobile number must be exactly 10 digits';
    else if (!MOBILE_RX.test(emergency)) e.emergencyContactNumber = 'Enter a valid mobile number starting with 6, 7, 8 or 9';
    else if (emergency === mobile) e.emergencyContactNumber = 'Must be different from your own number';
    // Required whenever the city has centres to choose from.
    if (centres.length && !form.preferredCentre) e.preferredCentre = 'Select your preferred centre';
    if (!form.preferredStartDate) e.preferredStartDate = 'Select a start date';
    else if (form.preferredStartDate < today()) e.preferredStartDate = 'Start date cannot be in the past';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setError('Please fix the highlighted fields.');
      return;
    }
    if (!isRealId(p._id)) {
      setError('This is a sample package. Ask HR to add packages in the HR Console before submitting.');
      return;
    }
    setBusy(true);
    // eslint-disable-next-line no-unused-vars
    const { plantSite, ...formWithoutSite } = form;
    try {
      const res = await requestService.submitOptIn({
        packageId: p._id,
        city: p.city || 'Mumbai',
        formData: {
          ...formWithoutSite,
          workLocation: fullLocation,
          emergencyContactName: form.emergencyContactName.trim(),
          mobileOnCultApp: cleanPhone(form.mobileOnCultApp),
          emergencyContactNumber: cleanPhone(form.emergencyContactNumber),
        },
        declarationsAccepted: allDeclared,
      });
      const d = res?.data || {};
      setDone({ refId: d.referenceId || d.request?.referenceId || d.data?.referenceId || '—', createdAt: d.createdAt || new Date() });
      window.scrollTo({ top: 0 });
    } catch (err) {
      // Show the server's field errors next to the fields, not just as a general message.
      const fieldErrors = err?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') setErrors((x) => ({ ...x, ...fieldErrors }));
      setError(errText(err, 'Failed to submit opt-in request'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  /* ── Confirmation screen ── */
  if (done) {
    const ackUser = { ...user, employeeId: form.employeeId || userEmpId(user), location: fullLocation || userLocation(user) };
    return (
      <div className="mx-auto max-w-xl pt-4">
        <div className={`${card} text-center`}>
          <CheckCircleOutlineOutlined sx={{ fontSize: 56 }} className="mx-auto text-[var(--success-text)]" />
          <h2 className="mt-2 text-xl font-bold text-[var(--ink)]">Request submitted!</h2>
          <p className="text-[13px] text-[var(--ink)]">
            Reference ID <b>{done.refId}</b>
          </p>
          <div className="my-4 text-left">
            <PlanSummary p={p} refId={done.refId} createdAt={done.createdAt} />
          </div>
          <p className="text-[13px] text-[var(--muted)]">
            HR will process your request and Cult.fit will SMS your activation link. You can track it under My Requests.
          </p>
          <div className="no-print mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={btn.outline}
              onClick={() => downloadAcknowledgement({ refId: done.refId, createdAt: done.createdAt, user: ackUser, plan: p, form })}
            >
              <FileDownloadOutlined sx={{ fontSize: 15 }} /> Download acknowledgement
            </button>
            <button type="button" className={btn.primary} onClick={() => setCurrentView('my')}>
              View my request
            </button>
          </div>
        </div>
      </div>
    );
  }

  const locked = [
    ['Full Name', userName(user)],
    ['Official Email ID', user?.email],
  ];

  return (
    <div>
      <h2 className="mb-4 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">Membership Opt-in Form</h2>
      <Banner>{error}</Banner>

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <form className={card} onSubmit={submit} noValidate>
          <h3 className="mb-3 font-bold text-[var(--ink)]">
            A. Employee details{' '}
            <small className="font-normal text-[var(--muted-2)]">
              (<LockOutlined sx={{ fontSize: 11 }} className="inline" /> name and email are auto-filled from login)
            </small>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee ID" required error={errors.employeeId} hint="As on your HREPL ID card, e.g. HR12345">
              <input
                className={input}
                style={errors.employeeId ? { borderColor: 'var(--danger)' } : undefined}
                autoComplete="off"
                maxLength={20}
                placeholder="Enter your employee ID"
                value={form.employeeId}
                onChange={(e) => update('employeeId', toEmpId(e.target.value))}
                aria-invalid={errors.employeeId ? true : undefined}
              />
            </Field>
            {locked.map(([l, v]) => (
              <Field key={l} label={l}>
                <input className={input} value={v || '—'} disabled readOnly />
              </Field>
            ))}
            <Field label="Work Location" required error={errors.workLocation}>
              <select
                className={input}
                style={errors.workLocation ? { borderColor: 'var(--danger)' } : undefined}
                value={form.workLocation}
                onChange={set('workLocation')}
                aria-invalid={errors.workLocation ? true : undefined}
              >
                <option value="">Select work location</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </Field>
            {form.workLocation === PLANT_SITE && (
              <Field label="Plant / site name" required error={errors.plantSite} hint="e.g. Jaisalmer Wind Farm">
                <input
                  className={input}
                  style={errors.plantSite ? { borderColor: 'var(--danger)' } : undefined}
                  autoComplete="off"
                  maxLength={60}
                  placeholder="Enter the plant / site name"
                  value={form.plantSite}
                  onChange={(e) => update('plantSite', toSite(e.target.value))}
                  aria-invalid={errors.plantSite ? true : undefined}
                />
              </Field>
            )}
            <Field label="Mobile (registered on Cult.fit app)" required error={errors.mobileOnCultApp} hint="10 digits, numbers only">
              <PhoneInput
                id="opt-mobile"
                autoComplete="tel-national"
                value={form.mobileOnCultApp}
                onChange={setMobile('mobileOnCultApp')}
                invalid={Boolean(errors.mobileOnCultApp)}
              />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select className={input} value={form.gender} onChange={set('gender')}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Date of Birth" required error={errors.dateOfBirth}>
              <input type="date" className={input} max={today()} value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </Field>
            <Field label="Already a Cult.fit member?" required>
              <select className={input} value={form.isExistingMember} onChange={set('isExistingMember')}>
                <option value="No">No</option>
                <option value="Yes">Yes – will upgrade / extend</option>
              </select>
            </Field>
            <Field label="Emergency contact name (optional)" error={errors.emergencyContactName}>
              <input
                className={input}
                style={errors.emergencyContactName ? { borderColor: 'var(--danger)' } : undefined}
                autoComplete="off"
                maxLength={50}
                value={form.emergencyContactName}
                onChange={setName('emergencyContactName')}
                aria-invalid={errors.emergencyContactName ? true : undefined}
              />
            </Field>
            <Field label="Emergency contact number (optional)" error={errors.emergencyContactNumber} hint="10 digits, numbers only">
              <PhoneInput
                id="opt-emergency"
                value={form.emergencyContactNumber}
                onChange={setMobile('emergencyContactNumber')}
                invalid={Boolean(errors.emergencyContactNumber)}
              />
            </Field>
          </div>

          <h3 className="mb-3 mt-6 font-bold text-[var(--ink)]">B. Preferences</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Preferred centre"
              required={centres.length > 0}
              error={errors.preferredCentre}
              hint={
                gymsLoading
                  ? 'Loading centres…'
                  : centres.length
                    ? `${centres.length} centre${centres.length > 1 ? 's' : ''} in ${p.city} covered by this package`
                    : `No centres listed yet for ${p.city || 'this city'}, so you can skip this`
              }
            >
              <SearchableSelect
                id="preferred-centre"
                value={form.preferredCentre}
                onChange={(v) => update('preferredCentre', v)}
                options={centreOptions}
                allLabel={null}
                placeholder={gymsLoading ? 'Loading…' : centres.length ? 'Select a centre' : '—'}
                searchPlaceholder="Search centres"
                emptyText="No centres match."
                disabled={gymsLoading || !centres.length}
                invalid={Boolean(errors.preferredCentre)}
              />
            </Field>
            <Field label="Preferred start date" required error={errors.preferredStartDate}>
              <input type="date" className={input} min={today()} value={form.preferredStartDate} onChange={set('preferredStartDate')} />
            </Field>
            <Field label="Any health condition to disclose (optional)" className="sm:col-span-2" hint="Visible only to HR admins.">
              <input className={input} maxLength={500} value={form.healthCondition} onChange={set('healthCondition')} />
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <textarea rows={2} maxLength={500} className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none transition-colors duration-[120ms] placeholder:text-[var(--muted-2)] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)]" value={form.remarks} onChange={set('remarks')} />
            </Field>
          </div>

          <h3 className="mb-2 mt-6 font-bold text-[var(--ink)]">C. Declaration</h3>
          <div className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-soft)] px-3 py-2.5 text-[12.5px] text-[var(--warn-text)]">
            {DECLARATIONS.map((d) => (
              <label key={d.key} className="my-2 flex cursor-pointer items-start gap-2 text-[13px]">
                <input
                  type="checkbox"
                  className="mt-1"
                  style={{ accentColor: 'var(--action)' }}
                  checked={declared[d.key]}
                  onChange={(e) => setDeclared((x) => ({ ...x, [d.key]: e.target.checked }))}
                />
                <span>
                  {typeof d.text === 'function' ? d.text(p) : d.text} <span className="text-[var(--danger)]">*</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={btn.secondary} onClick={() => setCurrentView('compare')}>
              Back
            </button>
            <button type="submit" className={btn.primary} disabled={busy || !allDeclared}>
              {busy ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Submitting…
                </>
              ) : (
                'Submit request'
              )}
            </button>
          </div>
        </form>

        <aside className={`${card} lg:sticky lg:top-20`}>
          <h3 className="mb-2 font-bold text-[var(--ink)]">Your selected plan</h3>
          <PlanSummary p={p} />
          <button type="button" className={`${btn.outline}${btn.sm} mt-3`} onClick={() => setCurrentView('home')}>
            Change plan
          </button>
          <p className="mt-3 text-[11px] text-[var(--muted-2)]">Payment is by payroll deduction only.</p>
        </aside>
      </div>
    </div>
  );
}
