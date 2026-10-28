import { useEffect, useMemo, useState } from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import { hrService, requestService } from '../../services/api';
import { downloadCsv } from '../../lib/csv';
import { TIER_LABEL, asList, can, errText, fmtDate, inr, normaliseRequest } from '../../lib/wellness';
import {
  Banner, Field, KpiCard, Modal, PageHeader, Spinner, StatusBadge, btn, exportBtn, input, useToast,
} from '../../components/ui';
import DataTable from '../../components/DataTable';

const SERVICE_STATUSES = ['Sent to Cult.fit', 'Active', 'Expiring', 'Issue', 'To cancel'];
const SEGMENTS = ['All', ...SERVICE_STATUSES];
const MEMBER_RX = /^[A-Z0-9-]{3,40}$/;
const DAY = 24 * 60 * 60 * 1000;
const NOTE_MAX = 300;

/* ── Helpers ── */
const expiryOf = (r) => {
  if (!r.activatedAt || !r.durationMonths) return null;
  const d = new Date(r.activatedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + r.durationMonths);
  return d;
};

const isExpiring30 = (r, now) => {
  if (r.status === 'Expiring') return true;
  if (r.status !== 'Active') return false;
  const e = expiryOf(r);
  return !!e && e.getTime() >= now && e.getTime() - now <= 30 * DAY;
};

/** Whole months elapsed since activation (+1 for the first deduction), capped at deductionMonths. */
const paidOf = (r, now) => {
  if (!r.activatedAt) return 0;
  const a = new Date(r.activatedAt);
  const n = new Date(now);
  if (Number.isNaN(a.getTime())) return 0;
  let elapsed = (n.getFullYear() - a.getFullYear()) * 12 + (n.getMonth() - a.getMonth());
  if (n.getDate() < a.getDate()) elapsed -= 1;
  return Math.max(0, Math.min(r.deductionMonths, elapsed + 1));
};

const deductionText = (r, now) => {
  if (r.status === 'Sent to Cult.fit') return 'Not started';
  const paid = paidOf(r, now);
  if (r.status === 'To cancel' && paid < r.deductionMonths) return `Recover ${inr((r.deductionMonths - paid) * r.monthlyDeduction)} in F&F`;
  return `${paid} of ${r.deductionMonths} done`;
};

const packageText = (r) => `${TIER_LABEL[r.tierCode] || r.packageName} ${r.durationMonths}m`;

/** Fetches every opt-in and keeps the service-stage ones; never throws. */
async function fetchService() {
  try {
    const res = await requestService.getAllOptIns();
    const list = asList(res?.data, 'requests', 'optIns')
      .map(normaliseRequest)
      .filter((r) => SERVICE_STATUSES.includes(r.status));
    return { list, error: '', now: Date.now() };
  } catch (err) {
    return { list: null, error: errText(err, 'Could not load service tracking'), now: Date.now() };
  }
}

/* ── Segmented control (spec 6.5) ── */
function Segmented({ value, onChange, items }) {
  return (
    <div role="group" aria-label="Filter by status" className="inline-flex h-[34px] items-center overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      {items.map(({ key, label, count }) => {
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap px-[14px] text-[12.5px] leading-[19.38px] transition-colors duration-[120ms] ${
              on
                ? 'bg-[var(--segment-active)] font-bold text-[var(--action-hover)]'
                : 'font-semibold text-[var(--grey)] hover:bg-[var(--hover-tint)] hover:text-[var(--action)]'
            }`}
          >
            {label}
            <span
              className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1.5 text-[11px] font-bold leading-[17.05px] ${
                on ? 'bg-[var(--surface)] text-[var(--action-hover)]' : 'bg-[var(--surface-3)] text-[var(--grey)]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HrService({ user, crumbs }) {
  const toast = useToast();
  const canService = can(user, 'serviceTracking');

  const [data, setData] = useState({ list: [], now: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tick, setTick] = useState(0);
  const [segment, setSegment] = useState('All');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // { row, status, memberId, note, error, busy, submitError }

  useEffect(() => {
    let alive = true;
    fetchService().then(({ list, error, now }) => {
      if (!alive) return;
      setData((d) => ({ list: list || d.list, now }));
      setLoadError(error);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = () => setTick((t) => t + 1);
  const { list, now } = data;

  const kpi = useMemo(
    () => ({
      active: list.filter((r) => r.status === 'Active').length,
      expiring: list.filter((r) => isExpiring30(r, now)).length,
      issues: list.filter((r) => r.status === 'Issue').length,
      exited: list.filter((r) => r.status === 'To cancel').length,
    }),
    [list, now]
  );

  const segments = SEGMENTS.map((key) => ({
    key,
    label: key,
    count: key === 'All' ? list.length : list.filter((r) => r.status === key).length,
  }));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list
      .filter((r) => segment === 'All' || r.status === segment)
      .filter(
        (r) =>
          !s ||
          [r.refId, r.employeeId, r.employeeName, r.employeeEmail, r.memberId, r.serviceNote].some((v) => String(v || '').toLowerCase().includes(s))
      )
      .sort((a, b) => new Date(b.activatedAt || b.createdAt || 0) - new Date(a.activatedAt || a.createdAt || 0));
  }, [list, segment, q]);

  const exportCsv = () => {
    downloadCsv(
      `service-tracking-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Ref ID', key: 'refId' },
        { header: 'Emp ID', key: 'employeeId' },
        { header: 'Name', key: 'employeeName' },
        { header: 'Email', key: 'employeeEmail' },
        { header: 'Package', value: (r) => TIER_LABEL[r.tierCode] || r.packageName },
        { header: 'Duration (months)', key: 'durationMonths' },
        { header: 'City', key: 'city' },
        { header: 'Cult.fit Member ID', key: 'memberId' },
        { header: 'Activated', value: (r) => (r.activatedAt ? new Date(r.activatedAt).toISOString().slice(0, 10) : '') },
        { header: 'Expiry', value: (r) => expiryOf(r)?.toISOString().slice(0, 10) || '' },
        { header: 'Payroll deduction', value: (r) => deductionText(r, now) },
        { header: 'Issue', key: 'serviceNote' },
        { header: 'Status', key: 'status' },
      ],
      rows
    );
    hrService.logExport('Service tracking', rows.length).catch(() => {});
    toast(`Exported ${rows.length} row(s)`);
  };

  const openEdit = (r) => setEdit({ row: r, status: r.status, memberId: r.memberId || '', note: r.serviceNote || '', error: '', submitError: '', busy: false });

  const save = async () => {
    if (!edit) return;
    const { row, status } = edit;
    const memberId = edit.memberId.trim().toUpperCase();
    const needsId = status === 'Active' && !row.memberId;
    if ((needsId && !memberId) || (memberId && !MEMBER_RX.test(memberId))) {
      setEdit((e) => ({ ...e, error: needsId && !memberId ? 'Enter the Cult.fit member ID to activate' : 'Use 3–40 letters, numbers or dashes, e.g. CF88231' }));
      return;
    }
    setEdit((e) => ({ ...e, busy: true, submitError: '' }));
    try {
      await requestService.updateStatus(
        row._id,
        status !== row.status ? status : undefined,
        memberId && memberId !== row.memberId ? memberId : undefined,
        edit.note.trim()
      );
      setEdit(null);
      toast('Saved');
      reload();
    } catch (err) {
      setEdit((e) => ({ ...e, busy: false, submitError: errText(err, 'Could not save') }));
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      width: '15%',
      sortValue: (r) => r.employeeName,
      render: (r) => (
        <span>
          <span className="text-[var(--muted)]">{r.employeeId}</span> <span className="text-[var(--ink-2)]">{r.employeeName}</span>
        </span>
      ),
      title: (r) => `${r.employeeId} ${r.employeeName}`.trim(),
    },
    { key: 'package', header: 'Package', width: '11%', sortValue: packageText, render: packageText },
    { key: 'memberId', header: 'Cult.fit Member ID', width: '11%', sortValue: (r) => r.memberId },
    { key: 'activatedAt', header: 'Activated', width: '9%', sortValue: (r) => (r.activatedAt ? new Date(r.activatedAt).getTime() : ''), render: (r) => (r.activatedAt ? fmtDate(r.activatedAt) : '') },
    { key: 'expiry', header: 'Expiry', width: '9%', sortValue: (r) => expiryOf(r)?.getTime() ?? '', render: (r) => { const e = expiryOf(r); return e ? fmtDate(e) : ''; } },
    { key: 'deduction', header: 'Payroll deduction', width: '13%', render: (r) => deductionText(r, now) },
    { key: 'serviceNote', header: 'Issue', width: '14%', wrap: true, sortValue: (r) => r.serviceNote },
    { key: 'status', header: 'Status', width: '10%', sortValue: (r) => SERVICE_STATUSES.indexOf(r.status), render: (r) => <StatusBadge status={r.status} />, title: (r) => r.status },
    ...(canService
      ? [
          {
            key: 'action',
            header: 'Action',
            width: '8%',
            render: (r) => (
              <button type="button" className={btn.smallGhost} onClick={() => openEdit(r)} aria-label={`Update ${r.refId}`}>
                Update
              </button>
            ),
            title: () => 'Update',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Service Tracking" />

      <Banner onRetry={loadError ? reload : undefined}>{loadError}</Banner>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Active" value={kpi.active} />
        <KpiCard label="Expiring in 30 days" value={kpi.expiring} />
        <KpiCard label="Activation issues" value={kpi.issues} />
        <KpiCard label="Exited (to cancel / recover)" value={kpi.exited} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="max-w-full overflow-x-auto">
          <Segmented value={segment} onChange={setSegment} items={segments} />
        </div>
        <div className="relative w-full sm:w-[280px]">
          <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-2)' }} />
          <input
            className={`${input} pl-9`}
            placeholder="Ref / Emp ID / name / member ID"
            aria-label="Search service tracking"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className={`${exportBtn} ml-auto`} onClick={exportCsv} disabled={!rows.length}>
          <TableViewOutlined sx={{ fontSize: 16 }} /> Export (Excel / CSV)
        </button>
      </div>

      {loading ? (
        <Spinner label="Loading service tracking…" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r._id}
          empty="No memberships in this stage."
          minWidth={1100}
          resetKey={`${segment}|${q}`}
        />
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Update ${edit.row.refId}` : ''}
        size="md"
        icon={EditOutlined}
        footer={
          <>
            <button type="button" className={btn.primary} disabled={edit?.busy} onClick={save}>
              {edit?.busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={btn.text} onClick={() => setEdit(null)}>
              Cancel
            </button>
          </>
        }
      >
        {edit && (
          <div className="space-y-3 py-2">
            <p className="text-[12.5px] text-[var(--muted)]">{`${edit.row.employeeId} ${edit.row.employeeName} · ${packageText(edit.row)}`}</p>
            <Banner>{edit.submitError}</Banner>
            <Field label="Status">
              <select
                className={input}
                data-autofocus
                value={edit.status}
                onChange={(e) => {
                  const status = e.target.value;
                  setEdit((x) => ({ ...x, status, error: '' }));
                }}
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Cult.fit member ID"
              required={edit.status === 'Active' && !edit.row.memberId}
              error={edit.error}
              hint="Letters, numbers and dashes, e.g. CF88231"
            >
              <input
                className={`${input} ${edit.error ? '!border-[var(--danger)]' : ''}`}
                value={edit.memberId}
                maxLength={40}
                onChange={(e) => {
                  const memberId = e.target.value.toUpperCase();
                  setEdit((x) => ({ ...x, memberId, error: '' }));
                }}
              />
            </Field>
            <Field label="Issue / note" hint={`${edit.note.length} / ${NOTE_MAX}`}>
              <textarea
                className={`${input} !h-auto min-h-[76px] py-2`}
                rows={3}
                maxLength={NOTE_MAX}
                placeholder="e.g. Mobile mismatch"
                value={edit.note}
                onChange={(e) => {
                  const note = e.target.value;
                  setEdit((x) => ({ ...x, note }));
                }}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
