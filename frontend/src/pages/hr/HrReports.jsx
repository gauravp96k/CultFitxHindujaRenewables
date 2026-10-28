import { useEffect, useMemo, useState } from 'react';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { requestService, hrService } from '../../services/api';
import { downloadCsv } from '../../lib/csv';
import { STATUSES, TIER_LABEL, asList, errText, fmtDate, fmtDateTime, inr, normaliseRequest } from '../../lib/wellness';
import { BarList, Banner, Empty, Field, PageHeader, Spinner, btn, card, exportBtn, input, useToast } from '../../components/ui';

/*
 * Consolidated Report (wireframe "h-rep"): group opt-ins by package × duration, city,
 * work location or payroll deduction month, with a bold Total row, Excel (CSV) and
 * printable PDF exports, ready-made operational downloads and data-derived insights.
 */

const GROUPS = ['Package × Duration', 'City', 'Location', 'Deduction month'];
const TIER_ORDER = Object.keys(TIER_LABEL);
const NOT_GIVEN = 'Not given';

/* Same header / cell recipes as DataTable.jsx (spec 6.7) so this table looks identical. */
const headerCls =
  'bg-[var(--surface-2)] px-[18px] py-[10px] text-left text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]';
const cellCls =
  'overflow-hidden text-ellipsis whitespace-nowrap px-[18px] py-[7px] text-[12.5px] leading-[19.38px] text-[var(--muted)] tabular-nums';

const monthKey = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '';
};
const monthLabel = (key) => {
  if (!key) return '—';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};
const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const sum = (list, f) => list.reduce((n, r) => n + (Number(f(r)) || 0), 0);
const realCity = (c) => (c && c !== '—' ? c : '');
const today = () => new Date().toISOString().slice(0, 10);

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/** Builds { columns, rows, total } for the chosen grouping. Column fmt: 'int' | 'inr' | undefined (text). */
function buildReport(groupBy, list) {
  const money = [
    { key: 'value', header: 'Value incl. GST', fmt: 'inr' },
    { key: 'recovery', header: 'Monthly payroll recovery', fmt: 'inr' },
  ];

  if (groupBy === 'Package × Duration') {
    const counts = {};
    list.forEach((r) => {
      const c = realCity(r.city);
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([c]) => c);
    const cityOf = (r) => (top.includes(realCity(r.city)) ? realCity(r.city) : '__others');
    const cityCols = [...top.map((c) => ({ key: `c:${c}`, header: c, fmt: 'int' })), { key: 'c:__others', header: 'Others', fmt: 'int' }];

    const groups = new Map();
    list.forEach((r) => {
      const k = `${r.tierCode}|${r.durationMonths}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const tierIdx = (t) => (TIER_ORDER.indexOf(t) === -1 ? TIER_ORDER.length : TIER_ORDER.indexOf(t));
    const rows = [...groups.values()]
      .map((items) => {
        const row = {
          _key: `${items[0].tierCode}|${items[0].durationMonths}`,
          _tier: items[0].tierCode,
          _dur: items[0].durationMonths,
          package: TIER_LABEL[items[0].tierCode] || items[0].tierCode || '—',
          duration: items[0].durationMonths ? `${items[0].durationMonths} m` : '—',
          total: items.length,
          value: sum(items, (r) => r.price),
          recovery: sum(items, (r) => r.monthlyDeduction),
        };
        cityCols.forEach((c) => {
          row[c.key] = items.filter((r) => `c:${cityOf(r)}` === c.key).length;
        });
        return row;
      })
      .sort((a, b) => tierIdx(a._tier) - tierIdx(b._tier) || a._dur - b._dur);

    const total = { package: 'Total', duration: '', total: list.length, value: sum(list, (r) => r.price), recovery: sum(list, (r) => r.monthlyDeduction) };
    cityCols.forEach((c) => {
      total[c.key] = sum(rows, (r) => r[c.key]);
    });
    return {
      columns: [
        { key: 'package', header: 'Package', width: '16%' },
        { key: 'duration', header: 'Duration', width: '9%' },
        ...cityCols,
        { key: 'total', header: 'Total emp.', fmt: 'int', bold: true },
        ...money,
      ],
      rows,
      total,
    };
  }

  if (groupBy === 'City' || groupBy === 'Location') {
    const label = groupBy === 'City' ? (r) => realCity(r.city) || NOT_GIVEN : (r) => String(r.location || '').trim() || NOT_GIVEN;
    const groups = new Map();
    list.forEach((r) => {
      const k = label(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const rows = [...groups.entries()]
      .map(([name, items]) => ({
        _key: name,
        name,
        total: items.length,
        value: sum(items, (r) => r.price),
        recovery: sum(items, (r) => r.monthlyDeduction),
      }))
      .sort((a, b) => (a.name === NOT_GIVEN) - (b.name === NOT_GIVEN) || b.total - a.total || a.name.localeCompare(b.name));
    return {
      columns: [
        { key: 'name', header: groupBy, width: '34%' },
        { key: 'total', header: 'Total emp.', fmt: 'int', bold: true },
        ...money,
      ],
      rows,
      total: { name: 'Total', total: list.length, value: sum(list, (r) => r.price), recovery: sum(list, (r) => r.monthlyDeduction) },
    };
  }

  // Deduction month: each request spreads its monthly deduction over deductionMonths
  // consecutive months, starting from the activation month (or the request month).
  const byMonth = new Map();
  let counted = 0;
  list.forEach((r) => {
    const start = monthKey(r.activatedAt || r.createdAt);
    if (!start || !r.monthlyDeduction) return;
    counted += 1;
    for (let i = 0; i < (r.deductionMonths || 0); i += 1) {
      const k = addMonths(start, i);
      const m = byMonth.get(k) || { count: 0, amount: 0 };
      m.count += 1;
      m.amount += r.monthlyDeduction;
      byMonth.set(k, m);
    }
  });
  const rows = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, m]) => ({ _key: k, month: monthLabel(k), employees: m.count, recovery: m.amount }));
  return {
    columns: [
      { key: 'month', header: 'Month', width: '34%' },
      { key: 'employees', header: 'Employees deducted', fmt: 'int', bold: true },
      { key: 'recovery', header: 'Recovery', fmt: 'inr' },
    ],
    rows,
    // Employees in the total row = distinct requests (an employee is deducted in several months).
    total: { month: 'Total', employees: counted, recovery: sum(rows, (r) => r.recovery) },
  };
}

const show = (col, v) => {
  if (col.fmt === 'inr') return inr(v);
  if (col.fmt === 'int') return Number(v || 0).toLocaleString('en-IN');
  return v === undefined || v === null || v === '' ? '' : String(v);
};

/* Read the design tokens from the app so the print window uses the same colours. */
function tokenCss() {
  const cs = getComputedStyle(document.documentElement);
  return ['--ink', '--ink-2', '--muted', '--line', '--surface', '--surface-2', '--brand']
    .map((t) => `${t}:${cs.getPropertyValue(t).trim()};`)
    .join('');
}

function printReport({ title, filters, report }) {
  const w = window.open('', '_blank');
  if (!w) return false;
  const head = report.columns
    .map((c) => `<th class="${c.fmt ? 'num' : ''}">${esc(c.header)}${c.fmt === 'inr' ? ' (₹)' : ''}</th>`)
    .join('');
  const line = (row, cls = '') =>
    `<tr class="${cls}">${report.columns
      .map((c) => `<td class="${c.fmt ? 'num' : ''}">${esc(c.fmt === 'inr' ? Math.round(row[c.key] || 0).toLocaleString('en-IN') : show(c, row[c.key]))}</td>`)
      .join('')}</tr>`;
  const body = report.rows.map((r) => line(r)).join('') + line(report.total, 'total');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
:root{${tokenCss()}}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);margin:24px;font-size:13px}
h1{font-size:22px;font-weight:700;margin:0 0 4px}
p{margin:0 0 4px;color:var(--muted);font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-variant-numeric:tabular-nums}
th{background:var(--surface-2);color:var(--muted);font-size:11px;font-weight:700;text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
td{font-size:12.5px;padding:6px 10px;border-bottom:1px solid var(--line);color:var(--ink-2)}
.num{text-align:right}
tr.total td{font-weight:700;color:var(--ink);background:var(--surface-2);border-top:1px solid var(--line)}
@media print{body{margin:12mm}th,tr.total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>${esc(title)}</h1>
<p>${esc(filters)}</p>
<p>Generated ${esc(fmtDateTime(new Date()))}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

/* ── Ready-made download formats ── */
const startMonth = (r) => monthLabel(monthKey(r.activatedAt || r.createdAt));
const DOWNLOADS = [
  {
    label: 'Cult.fit activation format',
    file: 'cultfit-activation',
    statuses: ['HR Approved'],
    columns: [
      { header: 'Ref ID', key: 'refId' },
      { header: 'Emp ID', key: 'employeeId' },
      { header: 'Name', key: 'employeeName' },
      { header: 'Email', key: 'employeeEmail' },
      { header: 'Mobile', value: (r) => r.form.mobileOnCultApp || '' },
      { header: 'Gender', value: (r) => r.form.gender || '' },
      { header: 'Date of birth', value: (r) => (r.form.dateOfBirth ? fmtDate(r.form.dateOfBirth) : '') },
      { header: 'City', key: 'city' },
      { header: 'Package', key: 'packageName' },
      { header: 'Duration (months)', key: 'durationMonths' },
      { header: 'Preferred centre', value: (r) => r.form.preferredCentre || '' },
      { header: 'Preferred start date', value: (r) => (r.form.preferredStartDate ? fmtDate(r.form.preferredStartDate) : '') },
    ],
  },
  {
    label: 'Payroll deduction file',
    file: 'payroll-deduction',
    statuses: ['Sent to Cult.fit', 'Active', 'Expiring', 'Issue'],
    columns: [
      { header: 'Emp ID', key: 'employeeId' },
      { header: 'Name', key: 'employeeName' },
      { header: 'Ref ID', key: 'refId' },
      { header: 'Package', key: 'packageName' },
      { header: 'Monthly deduction', key: 'monthlyDeduction' },
      { header: 'Months', key: 'deductionMonths' },
      { header: 'Total', key: 'price' },
      { header: 'Start month', value: startMonth },
    ],
  },
  {
    label: 'Finance invoice reconciliation',
    file: 'finance-reconciliation',
    statuses: ['Sent to Cult.fit', 'Active', 'Expiring'],
    columns: [
      { header: 'Ref ID', key: 'refId' },
      { header: 'Emp ID', key: 'employeeId' },
      { header: 'Name', key: 'employeeName' },
      { header: 'Package', key: 'packageName' },
      { header: 'Duration', value: (r) => (r.durationMonths ? `${r.durationMonths} months` : '') },
      { header: 'City', key: 'city' },
      { header: 'Amount incl. GST', key: 'price' },
      { header: 'Platform fee', value: (r) => r.packageDetails?.platformFee ?? '' },
      { header: 'Cult.fit member ID', key: 'memberId' },
      { header: 'Activated on', value: (r) => (r.activatedAt ? fmtDate(r.activatedAt) : '') },
    ],
  },
];

const topBy = (list, f) => {
  const counts = {};
  list.forEach((r) => {
    const k = f(r);
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

export default function HrReports({ crumbs }) {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [groupBy, setGroupBy] = useState(GROUPS[0]);
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let alive = true;
    requestService
      .getAllOptIns()
      .then((res) => alive && setRequests(asList(res?.data, 'requests').map(normaliseRequest)))
      .catch((err) => alive && setError(errText(err, 'Could not load opt-in requests')))
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

  const periods = useMemo(
    () => [...new Set(requests.map((r) => monthKey(r.createdAt)).filter(Boolean))].sort().reverse(),
    [requests]
  );
  const inPeriod = useMemo(() => requests.filter((r) => !period || monthKey(r.createdAt) === period), [requests, period]);
  const filtered = useMemo(
    () => inPeriod.filter((r) => (status ? r.status === status : r.status !== 'Rejected')),
    [inPeriod, status]
  );
  const report = useMemo(() => buildReport(groupBy, filtered), [groupBy, filtered]);

  const filterText = `Group by: ${groupBy} · Period: ${period ? monthLabel(period) : 'All periods'} · Status: ${status || 'All (excl. rejected)'}`;

  const logExport = (kind, n) =>
    hrService.logExport(kind, n).catch(() => setError('The file was downloaded, but the export could not be recorded in the audit trail.'));

  const exportExcel = () => {
    const cols = report.columns.map((c) => ({
      header: c.fmt === 'inr' ? `${c.header} (₹)` : c.header,
      value: (r) => (c.fmt ? Math.round(Number(r[c.key]) || 0) : r[c.key] ?? ''),
    }));
    downloadCsv(`consolidated-report-${groupBy.replace(/\W+/g, '-').toLowerCase()}-${today()}.csv`, cols, [...report.rows, report.total]);
    logExport(`Consolidated report – ${groupBy}`, report.rows.length);
    toast('Report downloaded');
  };

  const exportPdf = () => {
    if (!printReport({ title: 'Consolidated Report', filters: filterText, report })) {
      setError('The print window was blocked. Allow pop-ups for this site and try again.');
      return;
    }
    logExport(`Consolidated report – ${groupBy}`, report.rows.length);
  };

  const downloads = useMemo(
    () => DOWNLOADS.map((d) => ({ ...d, rows: requests.filter((r) => d.statuses.includes(r.status)) })),
    [requests]
  );
  const runDownload = (d) => {
    downloadCsv(`${d.file}-${today()}.csv`, d.columns, d.rows);
    logExport(d.label, d.rows.length);
    toast(`${d.label} downloaded`);
  };

  const locationBars = useMemo(
    () => topBy(filtered, (r) => String(r.location || '').trim() || NOT_GIVEN).slice(0, 6).map(([label, value]) => ({ label, value })),
    [filtered]
  );

  const insights = useMemo(() => {
    const live = inPeriod.filter((r) => r.status !== 'Rejected');
    if (!live.length) return [];
    const out = [`${live.length.toLocaleString('en-IN')} opt-ins worth ${inr(sum(live, (r) => r.price))} incl. GST.`];
    const pkg = topBy(live, (r) => (r.tierCode ? `${TIER_LABEL[r.tierCode] || r.tierCode}${r.durationMonths ? ` ${r.durationMonths} m` : ''}` : ''))[0];
    if (pkg) out.push(`Most popular package: ${pkg[0]} (${pkg[1]} opt-ins).`);
    const city = topBy(live, (r) => realCity(r.city))[0];
    if (city) out.push(`Most opt-ins by city: ${city[0]} (${city[1]}).`);
    const pending = live.filter((r) => r.status === 'Submitted').length;
    const approved = live.filter((r) => r.status === 'HR Approved').length;
    out.push(`${pending} pending HR approval; ${approved} approved but not yet sent to Cult.fit.`);
    const issues = live.filter((r) => r.status === 'Issue').length;
    if (issues) out.push(`${issues} with an activation issue to resolve.`);
    return out;
  }, [inPeriod]);

  const align = (c) => (c.fmt ? 'text-right' : 'text-left');

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="Consolidated Report" />

      <Banner onRetry={!requests.length && error ? retry : undefined}>{error}</Banner>

      {loading ? (
        <Spinner />
      ) : !requests.length ? (
        !error && (
          <Empty icon={DescriptionOutlined} title="No opt-in requests yet">
            The report fills in as employees submit opt-in requests.
          </Empty>
        )
      ) : (
        <>
          {/* Controls */}
          <div className={card}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Group by">
                <select className={input} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  {GROUPS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Period">
                <select className={input} value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="">All periods</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      {monthLabel(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All (excl. rejected)</option>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end gap-2.5">
                <button type="button" className={exportBtn} onClick={exportExcel}>
                  <TableViewOutlined sx={{ fontSize: 16 }} /> Excel
                </button>
                <button type="button" className={btn.secondary} onClick={exportPdf}>
                  <FileDownloadOutlined sx={{ fontSize: 14 }} /> PDF
                </button>
              </div>
            </div>
          </div>

          {/* Report table — styled like DataTable, plus a bold Total row */}
          <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse" style={{ minWidth: 900 }}>
                <colgroup>
                  {report.columns.map((c) => (
                    <col key={c.key} style={c.width ? { width: c.width } : undefined} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key} scope="col" className={`${headerCls} ${align(c)}`}>
                        <span className="block truncate" title={c.header}>
                          {c.header}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={r._key} style={i % 2 ? { background: 'var(--surface-2)' } : undefined}>
                      {report.columns.map((c) => {
                        const v = show(c, r[c.key]);
                        return (
                          <td key={c.key} title={v} className={`${cellCls} ${align(c)} ${c.bold ? 'font-bold text-[var(--ink)]' : ''}`}>
                            {v || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!report.rows.length && (
                    <tr>
                      <td className={`${cellCls} py-8 text-center text-[var(--muted-2)]`} colSpan={report.columns.length}>
                        No requests match these filters.
                      </td>
                    </tr>
                  )}
                  {report.rows.length > 0 && (
                    <tr className="border-t border-[var(--line)] bg-[var(--surface-2)]">
                      {report.columns.map((c) => (
                        <td key={c.key} className={`${cellCls} ${align(c)} font-bold text-[var(--ink)]`}>
                          {show(c, report.total[c.key])}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Ready-made downloads */}
            <div className={card}>
              <p className="mb-3 text-[13.5px] font-bold text-[var(--ink)]">Ready-made downloads</p>
              <div className="flex flex-col items-start gap-2.5">
                {downloads.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    className={`${btn.secondary}${btn.sm}`}
                    disabled={!d.rows.length}
                    onClick={() => runDownload(d)}
                  >
                    <FileDownloadOutlined sx={{ fontSize: 14 }} />
                    {d.label}
                    <span className="font-medium text-[var(--muted)]">({d.rows.length})</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-[var(--muted)]">Includes all periods; uses each request&apos;s current status.</p>
            </div>

            {/* Location participation */}
            <BarList title="Location participation" items={locationBars} />

            {/* Decision support */}
            <div className={card}>
              <p className="mb-3 text-[13.5px] font-bold text-[var(--ink)]">Decision support</p>
              {insights.length ? (
                <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-[var(--ink-2)]">
                  {insights.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-[var(--muted-2)]">No opt-ins in this period.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
