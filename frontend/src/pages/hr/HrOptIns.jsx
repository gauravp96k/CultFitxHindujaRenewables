import { useEffect, useMemo, useState } from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import { hrService, requestService } from '../../services/api';
import { downloadCsv, parseCsv, readFileText } from '../../lib/csv';
import {
  APPROVAL_STATUSES, DURATIONS, STATUSES, TIER_LABEL, asList, can, errText, fmtDate, fmtDateTime, inr, normaliseRequest,
} from '../../lib/wellness';
import {
  Banner, ConfirmDialog, Field, FileButton, IconButton, Modal, Note, PageHeader, Spinner, StatusBadge, TierBadge,
  btn, exportBtn, input, useToast,
} from '../../components/ui';
import DataTable from '../../components/DataTable';

const MEMBER_RX = /^[A-Z0-9-]{3,40}$/;
const ACTIVATABLE = ['HR Approved', 'Sent to Cult.fit', 'Active'];
const TIER_ORDER = Object.keys(TIER_LABEL);
const isoDay = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const yesNo = (v) => {
  if (v === true || /^(yes|true|y)$/i.test(String(v ?? ''))) return 'Yes';
  if (v === false || /^(no|false|n)$/i.test(String(v ?? ''))) return 'No';
  return v || '';
};
const memberIdError = (v) => {
  const id = String(v || '').trim().toUpperCase();
  if (!id) return 'Enter the Cult.fit member ID';
  return MEMBER_RX.test(id) ? '' : 'Use 3–40 letters, numbers or dashes, e.g. CF88231';
};

/** Fetches every opt-in; never throws. */
async function fetchOptIns() {
  try {
    const res = await requestService.getAllOptIns();
    return { list: asList(res?.data, 'requests', 'optIns').map(normaliseRequest), error: '' };
  } catch (err) {
    return { list: null, error: errText(err, 'Could not load opt-ins') };
  }
}

/* Label / value list used inside the detail modal. */
function Section({ title, rows, children }) {
  return (
    <section className="py-2">
      <p className="mb-1.5 text-[13.5px] font-bold text-[var(--ink)]">{title}</p>
      {rows && (
        <dl className="grid gap-x-6 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[44%_1fr] gap-2 border-b border-[var(--line-soft)] py-1.5 text-[12.5px]">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="break-words text-[var(--ink-2)]">{v === undefined || v === null || v === '' ? '—' : v}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

export default function HrOptIns({ user, opts, crumbs }) {
  const toast = useToast();
  const canApprove = can(user, 'approveOptIns');
  const canService = can(user, 'serviceTracking');
  const canReports = can(user, 'reports');

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tick, setTick] = useState(0);

  const [f, setF] = useState({ q: '', city: '', tier: '', duration: '', status: opts?.status || '' });
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const [detailId, setDetailId] = useState(null);
  const [detailStatus, setDetailStatus] = useState('');
  const [audit, setAudit] = useState({ state: 'idle', list: [], error: '' });
  const [rejectIds, setRejectIds] = useState(null);
  const [activate, setActivate] = useState(null); // { ids, memberId, error }
  const [importResult, setImportResult] = useState(null); // { problems } | { ok, failures }

  useEffect(() => {
    let alive = true;
    fetchOptIns().then(({ list, error }) => {
      if (!alive) return;
      if (list) setAll(list);
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = () => setTick((t) => t + 1);

  /* ── Filters ── */
  const cities = useMemo(() => [...new Set(all.map((r) => r.city).filter((c) => c && c !== '—'))].sort(), [all]);
  const tiers = useMemo(
    () => [...new Set(all.map((r) => r.tierCode).filter(Boolean))].sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)),
    [all]
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return all
      .filter(
        (r) =>
          (!f.status || r.status === f.status) &&
          (!f.city || r.city === f.city) &&
          (!f.tier || r.tierCode === f.tier) &&
          (!f.duration || r.durationMonths === Number(f.duration)) &&
          (!q || [r.refId, r.employeeId, r.employeeName, r.employeeEmail, r.memberId].some((v) => String(v || '').toLowerCase().includes(q)))
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [all, f]);

  const setFilter = (k) => (e) => {
    const value = e.target.value;
    setF((x) => ({ ...x, [k]: value }));
    setSelected([]);
  };

  const selectedRows = filtered.filter((r) => selected.includes(r._id));
  const idsWith = (...st) => selectedRows.filter((r) => st.includes(r.status)).map((r) => r._id);
  const toApprove = idsWith('Submitted');
  const toReject = idsWith('Submitted', 'HR Approved');
  const toSend = idsWith('HR Approved');

  /* ── Audit history (Reports permission) ── */
  const loadAudit = () => {
    if (!canReports) return;
    setAudit((a) => ({ ...a, state: 'loading', error: '' }));
    hrService
      .getAuditLogs()
      .then((res) => setAudit({ state: 'done', list: asList(res?.data, 'logs'), error: '' }))
      .catch((err) => setAudit({ state: 'error', list: [], error: errText(err, 'Could not load the status history') }));
  };

  const openDetail = (r) => {
    setDetailId(r._id);
    setDetailStatus(r.status);
    if (canReports && audit.state !== 'done' && audit.state !== 'loading') loadAudit();
  };

  /* ── Updates ── */
  const runUpdate = async (ids, status, memberId) => {
    if (!ids.length) return;
    setBusy(true);
    setActionError('');
    const results = await Promise.allSettled(ids.map((id) => requestService.updateStatus(id, status, memberId)));
    const failed = results.filter((x) => x.status === 'rejected');
    const ok = results.length - failed.length;
    if (ok) toast(`${ok} request(s) updated`);
    if (failed.length) setActionError(`${failed.length} request(s) could not be updated: ${errText(failed[0].reason)}`);
    setSelected([]);
    setBusy(false);
    reload();
    if (detailId && audit.state === 'done') loadAudit();
  };

  const confirmReject = async () => {
    const ids = rejectIds || [];
    await runUpdate(ids, 'Rejected');
    setRejectIds(null);
  };

  const submitActivate = async () => {
    const error = memberIdError(activate?.memberId);
    if (error) {
      setActivate((a) => ({ ...a, error }));
      return;
    }
    const { ids, memberId } = activate;
    setActivate(null);
    await runUpdate(ids, 'Active', memberId.trim().toUpperCase());
  };

  const detail = detailId ? all.find((r) => r._id === detailId) : null;
  const statusOptions = STATUSES.filter((s) => (APPROVAL_STATUSES.includes(s) ? canApprove : canService));

  const applyDetailStatus = () => {
    if (!detail || detailStatus === detail.status) return;
    if (detailStatus === 'Active') setActivate({ ids: [detail._id], memberId: detail.memberId || '', error: '' });
    else runUpdate([detail._id], detailStatus);
  };

  /* ── Activation file ── */
  const uploadActivation = async (file) => {
    setActionError('');
    let rows;
    try {
      rows = parseCsv(await readFileText(file));
    } catch (err) {
      setActionError(errText(err, 'Could not read the file'));
      return;
    }
    const byRef = new Map(all.map((r) => [String(r.refId).toUpperCase(), r]));
    const problems = [];
    const seen = new Set();
    const plan = [];
    if (!rows.length) problems.push({ row: 1, ref: '', issue: 'The file has no data rows' });
    else if (!('refid' in rows[0]) || !('cultfitmemberid' in rows[0]))
      problems.push({ row: 1, ref: '', issue: 'Columns "Ref ID" and "Cult.fit Member ID" are required' });
    else
      rows.forEach((row) => {
        const ref = String(row.refid || '').trim().toUpperCase();
        const memberId = String(row.cultfitmemberid || '').trim().toUpperCase();
        const req = byRef.get(ref);
        let issue = '';
        if (!ref) issue = 'Ref ID is missing';
        else if (seen.has(ref)) issue = 'Duplicate Ref ID in the file';
        else if (!req) issue = 'Unknown Ref ID';
        else if (memberIdError(memberId)) issue = `Invalid Cult.fit member ID "${memberId}"`;
        else if (!ACTIVATABLE.includes(req.status)) issue = `Request is "${req.status}" (must be HR Approved, Sent to Cult.fit or Active)`;
        if (ref) seen.add(ref);
        if (issue) problems.push({ row: row.__row, ref, issue });
        else plan.push({ row: row.__row, ref, id: req._id, memberId });
      });

    if (problems.length) {
      setImportResult({ problems });
      return;
    }

    setBusy(true);
    const results = await Promise.allSettled(plan.map((p) => requestService.updateStatus(p.id, 'Active', p.memberId)));
    const failures = results
      .map((x, i) => (x.status === 'rejected' ? { row: plan[i].row, ref: plan[i].ref, issue: errText(x.reason) } : null))
      .filter(Boolean);
    const ok = results.length - failures.length;
    setBusy(false);
    if (ok) toast(`${ok} request(s) updated`);
    setImportResult({ ok, failures });
    reload();
  };

  /* ── Export ── */
  const exportCsv = () => {
    downloadCsv(
      `employee-opt-ins-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Ref ID', key: 'refId' },
        { header: 'Emp ID', key: 'employeeId' },
        { header: 'Name', key: 'employeeName' },
        { header: 'Email', key: 'employeeEmail' },
        { header: 'Location', key: 'location' },
        { header: 'Mobile (Cult.fit app)', value: (r) => r.form?.mobileOnCultApp },
        { header: 'Package', value: (r) => TIER_LABEL[r.tierCode] || r.packageName },
        { header: 'Duration (months)', key: 'durationMonths' },
        { header: 'City', key: 'city' },
        { header: 'Amount (incl. GST)', key: 'price' },
        { header: 'Monthly deduction', key: 'monthlyDeduction' },
        { header: 'Deduction months', key: 'deductionMonths' },
        { header: 'Medical fitness declared', value: (r) => (r.declarationsAccepted ? 'Yes' : 'No') },
        { header: 'Declarations accepted at', value: (r) => (r.declarationsAcceptedAt ? new Date(r.declarationsAcceptedAt).toISOString() : '') },
        { header: 'Request date', value: (r) => isoDay(r.createdAt) },
        { header: 'Status', key: 'status' },
        { header: 'Preferred centre', value: (r) => r.form?.preferredCentre },
        { header: 'Preferred start', value: (r) => isoDay(r.form?.preferredStartDate) },
        { header: 'Cult.fit Member ID', key: 'memberId' },
      ],
      filtered
    );
    hrService.logExport('Employee opt-ins', filtered.length).catch(() => {});
    toast(`Exported ${filtered.length} row(s)`);
  };

  /* ── Table ── */
  const columns = [
    { key: 'refId', header: 'Ref ID', width: '8%', sortValue: (r) => r.refId, render: (r) => <span className="font-semibold text-[var(--ink)]">{r.refId}</span>, title: (r) => r.refId },
    { key: 'employeeId', header: 'Emp ID', width: '6%', sortValue: (r) => r.employeeId },
    { key: 'employeeName', header: 'Name', width: '9%', sortValue: (r) => r.employeeName, render: (r) => <span className="text-[var(--ink-2)]">{r.employeeName}</span>, title: (r) => r.employeeName },
    { key: 'employeeEmail', header: 'Email', width: '11%', sortValue: (r) => r.employeeEmail },
    { key: 'location', header: 'Location', width: '7%', sortValue: (r) => r.location },
    { key: 'tierCode', header: 'Package', width: '9%', sortValue: (r) => TIER_LABEL[r.tierCode] || r.packageName, render: (r) => <TierBadge tier={r.tierCode} />, title: (r) => TIER_LABEL[r.tierCode] || r.packageName },
    { key: 'durationMonths', header: 'Duration', width: '5%', align: 'center', sortValue: (r) => r.durationMonths, render: (r) => (r.durationMonths ? `${r.durationMonths} m` : '') },
    { key: 'city', header: 'City', width: '6%', sortValue: (r) => r.city },
    { key: 'price', header: 'Amount (incl. GST)', width: '7%', align: 'right', sortValue: (r) => r.price, render: (r) => inr(r.price) },
    { key: 'deduction', header: 'Payroll deduction', width: '8%', sortValue: (r) => r.monthlyDeduction, render: (r) => `${inr(r.monthlyDeduction)} × ${r.deductionMonths}` },
    {
      key: 'medical',
      header: 'Medical fitness',
      width: '6%',
      align: 'center',
      sortValue: (r) => (r.declarationsAccepted ? 1 : 0),
      render: (r) => (r.declarationsAccepted ? <CheckOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--success-text)' }} aria-label="Declared" /> : '—'),
      title: (r) => (r.declarationsAccepted ? 'All declarations accepted' : 'Not recorded'),
    },
    { key: 'createdAt', header: 'Request date', width: '7%', sortValue: (r) => new Date(r.createdAt || 0).getTime(), render: (r) => fmtDate(r.createdAt) },
    { key: 'status', header: 'Status', width: '8%', sortValue: (r) => STATUSES.indexOf(r.status), render: (r) => <StatusBadge status={r.status} />, title: (r) => r.status },
    {
      key: 'actions',
      header: 'Actions',
      width: '7%',
      render: (r) => (
        <span className="inline-flex items-center gap-0.5">
          <IconButton icon={VisibilityOutlined} label="View" onClick={() => openDetail(r)} />
          {r.status === 'Submitted' && canApprove && (
            <>
              <IconButton icon={CheckOutlined} label="Approve" disabled={busy} onClick={() => runUpdate([r._id], 'HR Approved')} />
              <IconButton icon={CloseOutlined} label="Reject" danger disabled={busy} onClick={() => setRejectIds([r._id])} />
            </>
          )}
        </span>
      ),
      title: () => 'Actions',
    },
  ];

  const f0 = detail?.form || {};
  const history = detail
    ? audit.list
        .filter((a) => a.recordReference === detail.refId)
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    : [];

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Employee Opt-ins" />

      <div className="grid gap-2.5 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div className="relative">
          <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-2)' }} />
          <input
            className={`${input} pl-9`}
            placeholder="Ref / Emp ID / name / email / member ID"
            aria-label="Search opt-ins"
            value={f.q}
            onChange={setFilter('q')}
          />
        </div>
        <select className={input} value={f.city} onChange={setFilter('city')} aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={input} value={f.tier} onChange={setFilter('tier')} aria-label="Package">
          <option value="">All packages</option>
          {tiers.map((t) => (
            <option key={t} value={t}>{TIER_LABEL[t] || t}</option>
          ))}
        </select>
        <select className={input} value={f.duration} onChange={setFilter('duration')} aria-label="Duration">
          <option value="">All durations</option>
          {DURATIONS.map((d) => (
            <option key={d} value={d}>{d} m</option>
          ))}
        </select>
        <select className={input} value={f.status} onChange={setFilter('status')} aria-label="Status">
          <option value="">All status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <>
            <button type="button" className={`${btn.primary}${btn.sm}`} disabled={busy || !toApprove.length} onClick={() => runUpdate(toApprove, 'HR Approved')}>
              <CheckOutlined sx={{ fontSize: 14 }} /> Approve selected
            </button>
            <button type="button" className={`${btn.secondary}${btn.sm}`} disabled={busy || !toReject.length} onClick={() => setRejectIds(toReject)}>
              <CloseOutlined sx={{ fontSize: 14 }} /> Reject
            </button>
          </>
        )}
        {canService && (
          <>
            <button type="button" className={`${btn.secondary}${btn.sm}`} disabled={busy || !toSend.length} onClick={() => runUpdate(toSend, 'Sent to Cult.fit')}>
              Mark sent to Cult.fit
            </button>
            <FileButton onFile={uploadActivation} accept=".csv" className={`${btn.secondary}${btn.sm}`}>
              Upload activation file
            </FileButton>
          </>
        )}
        <button type="button" className={`${exportBtn} ml-auto`} onClick={exportCsv} disabled={!filtered.length}>
          <TableViewOutlined sx={{ fontSize: 16 }} /> Export (Excel / CSV)
        </button>
      </div>

      <Banner onRetry={loadError ? reload : undefined}>{loadError}</Banner>
      <Banner>{actionError}</Banner>

      {loading ? (
        <Spinner label="Loading opt-ins…" />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r._id}
          selectable={canApprove || canService}
          selected={selected}
          onSelectedChange={setSelected}
          empty="No requests match these filters."
          minWidth={1500}
          resetKey={JSON.stringify(f)}
        />
      )}

      <Note>
        Clicking View opens the full form, the consents with timestamps and the status history. Every status change is recorded in the Audit Trail.
      </Note>

      {/* Detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail ? `${detail.refId} · ${detail.employeeName}` : ''}
        size="lg"
        icon={VisibilityOutlined}
        footer={
          <button type="button" className={btn.text} onClick={() => setDetailId(null)}>
            Close
          </button>
        }
      >
        {detail && (
          <div className="divide-y divide-[var(--line-soft)]">
            <Section
              title="Employee"
              rows={[
                ['Name', detail.employeeName],
                ['Emp ID', detail.employeeId],
                ['Email', detail.employeeEmail],
                ['Work location', detail.location],
              ]}
            />
            <Section
              title="Form"
              rows={[
                ['Mobile (Cult.fit app)', f0.mobileOnCultApp],
                ['Gender', f0.gender],
                ['Date of birth', f0.dateOfBirth && fmtDate(f0.dateOfBirth)],
                ['Existing Cult.fit member', yesNo(f0.isExistingMember)],
                ['Emergency contact', [f0.emergencyContactName, f0.emergencyContactNumber].filter(Boolean).join(' · ')],
                ['Preferred centre', f0.preferredCentre],
                ['Preferred start', f0.preferredStartDate && fmtDate(f0.preferredStartDate)],
                ['Health condition', f0.healthCondition],
                ['Remarks', f0.remarks],
              ]}
            />
            <Section
              title="Package"
              rows={[
                ['Package', <TierBadge key="t" tier={detail.tierCode} />],
                ['Duration', detail.durationMonths ? `${detail.durationMonths} months` : ''],
                ['City', detail.city],
                ['Amount (incl. GST)', inr(detail.price)],
                ['Payroll deduction', `${inr(detail.monthlyDeduction)} × ${detail.deductionMonths} months`],
                ['Request date', fmtDateTime(detail.createdAt)],
                ['Status', <StatusBadge key="s" status={detail.status} />],
                ['Cult.fit member ID', detail.memberId],
                ['Activated', detail.activatedAt ? fmtDate(detail.activatedAt) : ''],
                ['Service note', detail.serviceNote],
              ]}
            />
            <Section title="Consents">
              <p className="text-[12.5px] text-[var(--ink-2)]">
                {detail.declarationsAccepted
                  ? `All 4 declarations accepted on ${fmtDateTime(detail.declarationsAcceptedAt)}`
                  : 'Not recorded'}
              </p>
            </Section>
            <Section title="Status history">
              {!canReports ? (
                <p className="text-[12.5px] text-[var(--muted)]">Status history is visible to users with Reports &amp; export access.</p>
              ) : audit.state === 'loading' || audit.state === 'idle' ? (
                <p className="text-[12.5px] text-[var(--muted)]">Loading history…</p>
              ) : audit.state === 'error' ? (
                <Banner onRetry={loadAudit}>{audit.error}</Banner>
              ) : !history.length ? (
                <p className="text-[12.5px] text-[var(--muted)]">No recorded changes yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((h, i) => (
                    <li key={h._id || `${h.timestamp}-${i}`} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                      <span className="inline-flex rounded-[999px] bg-[var(--surface-3)] px-[9px] py-[3px] text-[11px] font-bold text-[var(--ink-2)]">
                        {fmtDateTime(h.timestamp)}
                      </span>
                      <span className="font-semibold text-[var(--ink)]">{h.action}</span>
                      {h.oldToNewState && <span className="text-[var(--muted)]">{h.oldToNewState}</span>}
                      {h.user?.fullName && <span className="text-[var(--muted-2)]">by {h.user.fullName}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            {(canApprove || canService) && (
              <Section title="Change status">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={`${input} !w-auto min-w-[200px]`}
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    aria-label="New status"
                  >
                    {!statusOptions.includes(detail.status) && <option value={detail.status}>{detail.status}</option>}
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button type="button" className={btn.primary} disabled={busy || detailStatus === detail.status} onClick={applyDetailStatus}>
                    Update
                  </button>
                </div>
              </Section>
            )}
          </div>
        )}
      </Modal>

      {/* Reject confirmation */}
      <ConfirmDialog
        open={!!rejectIds}
        title={`Reject ${rejectIds?.length || 0} request(s)?`}
        confirmLabel="Reject"
        busy={busy}
        onConfirm={confirmReject}
        onCancel={() => setRejectIds(null)}
      >
        The employee will see the request as Rejected. This is recorded in the Audit Trail.
      </ConfirmDialog>

      {/* Activation: Cult.fit member ID */}
      <Modal
        open={!!activate}
        onClose={() => setActivate(null)}
        title="Activate membership"
        size="sm"
        icon={CheckOutlined}
        footer={
          <>
            <button type="button" className={btn.primary} disabled={busy} onClick={submitActivate}>
              Activate
            </button>
            <button type="button" className={btn.text} onClick={() => setActivate(null)}>
              Cancel
            </button>
          </>
        }
      >
        <Field label="Cult.fit member ID" required error={activate?.error} hint="Letters, numbers and dashes, e.g. CF88231">
          <input
            className={`${input} ${activate?.error ? '!border-[var(--danger)]' : ''}`}
            data-autofocus
            value={activate?.memberId || ''}
            maxLength={40}
            onChange={(e) => {
              const memberId = e.target.value.toUpperCase();
              setActivate((a) => ({ ...a, memberId, error: '' }));
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitActivate()}
          />
        </Field>
      </Modal>

      {/* Activation file result */}
      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="Activation file"
        size="md"
        icon={AssignmentOutlined}
        footer={
          <button type="button" className={btn.primary} onClick={() => setImportResult(null)}>
            Close
          </button>
        }
      >
        {importResult?.problems ? (
          <div className="space-y-3 py-1">
            <Banner>{`${importResult.problems.length} problem(s) found. Nothing was imported — fix the file and upload it again.`}</Banner>
            <DataTable
              columns={[
                { key: 'row', header: 'Row', width: '12%', align: 'center' },
                { key: 'ref', header: 'Ref ID', width: '25%' },
                { key: 'issue', header: 'Issue', width: '63%', wrap: true },
              ]}
              rows={importResult.problems}
              rowKey={(p) => `${p.row}-${p.issue}`}
              minWidth={480}
            />
          </div>
        ) : importResult ? (
          <div className="space-y-3 py-1">
            <p className="text-[13px] text-[var(--ink-2)]">{`${importResult.ok} request(s) set to Active.`}</p>
            {importResult.failures.length > 0 && (
              <>
                <Banner>{`${importResult.failures.length} row(s) could not be updated.`}</Banner>
                <DataTable
                  columns={[
                    { key: 'row', header: 'Row', width: '12%', align: 'center' },
                    { key: 'ref', header: 'Ref ID', width: '25%' },
                    { key: 'issue', header: 'Issue', width: '63%', wrap: true },
                  ]}
                  rows={importResult.failures}
                  rowKey={(p) => `${p.row}-${p.ref}`}
                  minWidth={480}
                />
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
