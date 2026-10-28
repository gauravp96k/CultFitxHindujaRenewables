import { useEffect, useMemo, useState } from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import { hrService } from '../../services/api';
import { downloadCsv } from '../../lib/csv';
import { asList, errText, fmtDateTime } from '../../lib/wellness';
import { Banner, Note, PageHeader, Spinner, exportBtn, input, useToast } from '../../components/ui';
import DataTable from '../../components/DataTable';

/*
 * Audit Trail (wireframe "h-aud"): read-only log of every submission, decision,
 * export, price / access change and upload. Filters: search, action, date range.
 */

const when = (l) => l.timestamp || l.createdAt;
const time = (l) => new Date(when(l) || 0).getTime() || 0;
const userKey = (l) => l.user?.employeeId || l.user?.email || '—';
const userName = (l) => l.user?.fullName || '';

const columns = [
  { key: 'timestamp', header: 'Timestamp', width: '14%', render: (l) => fmtDateTime(when(l)), sortValue: time },
  {
    key: 'user',
    header: 'User',
    width: '13%',
    render: userKey,
    title: (l) => [userKey(l), userName(l)].filter(Boolean).join(' · '),
    sortValue: userKey,
  },
  { key: 'role', header: 'Role', width: '11%', render: (l) => l.role || '', sortValue: (l) => l.role || '' },
  {
    key: 'action',
    header: 'Action',
    width: '16%',
    render: (l) => (l.action ? <span className="font-bold text-[var(--ink-2)]">{l.action}</span> : ''),
    title: (l) => l.action || '',
    sortValue: (l) => l.action || '',
  },
  { key: 'record', header: 'Record', width: '20%', wrap: true, render: (l) => l.recordReference || '' },
  { key: 'change', header: 'Old → New', width: '26%', wrap: true, render: (l) => l.oldToNewState || '' },
];

export default function HrAudit({ crumbs }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [f, setF] = useState({ q: '', action: '', from: '', to: '' });

  useEffect(() => {
    let alive = true;
    hrService
      .getAuditLogs()
      .then((res) => alive && setLogs(asList(res?.data, 'logs', 'auditLogs')))
      .catch((err) => alive && setError(errText(err, 'Could not load the audit trail')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reload]);

  const retry = () => {
    setLoading(true);
    setError('');
    setReload((n) => n + 1);
  };

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action).filter(Boolean))].sort(), [logs]);

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
    const to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
    return logs
      .filter((l) => {
        const t = time(l);
        return (
          (!f.action || l.action === f.action) &&
          (from === null || t >= from) &&
          (to === null || t <= to) &&
          (!q ||
            [l.user?.employeeId, l.user?.email, l.user?.fullName, l.recordReference, l.oldToNewState, l.action].some((v) =>
              String(v || '').toLowerCase().includes(q)
            ))
        );
      })
      .sort((a, b) => time(b) - time(a));
  }, [logs, f]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const exportCsv = () => {
    downloadCsv(
      `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: 'Timestamp', value: (l) => fmtDateTime(when(l)) },
        { header: 'User', value: userKey },
        { header: 'Name', value: userName },
        { header: 'Role', value: (l) => l.role || '' },
        { header: 'Action', value: (l) => l.action || '' },
        { header: 'Record', value: (l) => l.recordReference || '' },
        { header: 'Old → New', value: (l) => l.oldToNewState || '' },
      ],
      filtered
    );
    hrService
      .logExport('Audit trail', filtered.length)
      .catch(() => setError('The file was downloaded, but the export could not be recorded in the audit trail.'));
    toast('Audit log downloaded');
  };

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Audit Trail" />

      <div className="grid gap-2.5 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <SearchOutlined
            sx={{ fontSize: 15 }}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
          />
          <input
            className={`${input} pl-9`}
            placeholder="User / ref ID / change"
            aria-label="Search audit trail"
            value={f.q}
            onChange={set('q')}
          />
        </div>
        <select className={input} value={f.action} onChange={set('action')} aria-label="Action">
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input type="date" className={input} value={f.from} max={f.to || undefined} onChange={set('from')} aria-label="From date" title="From date" />
        <input type="date" className={input} value={f.to} min={f.from || undefined} onChange={set('to')} aria-label="To date" title="To date" />
        <button type="button" className={exportBtn} onClick={exportCsv} disabled={!filtered.length}>
          <TableViewOutlined sx={{ fontSize: 16 }} /> Export log
        </button>
      </div>

      <Banner onRetry={!logs.length && error ? retry : undefined}>{error}</Banner>

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(l) => l._id || `${when(l)}-${l.action}-${l.recordReference}`}
          resetKey={`${f.q}|${f.action}|${f.from}|${f.to}`}
          empty={logs.length ? 'No audit entries match these filters.' : 'No audit entries yet.'}
        />
      )}

      <Note>Read-only. Entries cannot be edited or deleted.</Note>
    </div>
  );
}
