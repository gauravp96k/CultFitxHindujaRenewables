import { useEffect, useMemo, useState } from 'react';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import { hrService, requestService } from '../../services/api';
import { ENROLMENT, TIER_LABEL, asList, can, errText, fmtDate, inrLakh, months, normaliseRequest } from '../../lib/wellness';
import { Banner, BarList, KpiCard, PageHeader, Spinner, StatusBadge, TierBadge, btn, card } from '../../components/ui';
import DataTable from '../../components/DataTable';

const DAY = 24 * 60 * 60 * 1000;

/** activatedAt + durationMonths months, or null when not activated. */
const expiryOf = (r) => {
  if (!r.activatedAt || !r.durationMonths) return null;
  const d = new Date(r.activatedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + r.durationMonths);
  return d;
};

/** Status Expiring, or Active with an expiry inside the next 30 days. */
const isExpiring30 = (r, now) => {
  if (r.status === 'Expiring') return true;
  if (r.status !== 'Active') return false;
  const e = expiryOf(r);
  return !!e && e.getTime() >= now && e.getTime() - now <= 30 * DAY;
};

const countBy = (list, fn) => {
  const m = new Map();
  list.forEach((x) => {
    const k = fn(x);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

/** Loads KPIs and every opt-in; never throws. */
async function fetchDashboard() {
  const [k, o] = await Promise.allSettled([hrService.getDashboardKPIs(), requestService.getAllOptIns()]);
  return {
    kpis: k.status === 'fulfilled' ? k.value?.data || null : null,
    optIns: o.status === 'fulfilled' ? asList(o.value?.data, 'requests', 'optIns').map(normaliseRequest) : [],
    error:
      k.status === 'rejected' && o.status === 'rejected'
        ? errText(o.reason, 'Could not load the dashboard')
        : o.status === 'rejected'
          ? errText(o.reason, 'Could not load the opt-in list')
          : '',
    now: Date.now(),
  };
}

export default function HrDashboard({ user, go, crumbs }) {
  const [data, setData] = useState({ kpis: null, optIns: [], error: '', now: 0 });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDashboard().then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const refresh = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  const s = useMemo(() => {
    const { kpis, optIns, now } = data;
    const by = (st) => optIns.filter((r) => r.status === st).length;
    const live = optIns.filter((r) => r.status !== 'Rejected');
    return {
      total: kpis?.totalOptIns ?? live.length,
      pending: kpis?.pendingHR ?? by('Submitted'),
      sent: kpis?.sentToCult ?? by('Sent to Cult.fit'),
      active: kpis?.activeMembers ?? by('Active'),
      value: kpis?.totalValue ?? live.reduce((n, r) => n + r.price, 0),
      issues: kpis?.issues ?? by('Issue'),
      expiring30: optIns.filter((r) => isExpiring30(r, now)).length,
      byTier: countBy(live, (r) => TIER_LABEL[r.tierCode] || r.packageName),
      byDuration: countBy(live, (r) => (r.durationMonths ? months(r.durationMonths) : '')),
      byCity: countBy(live, (r) => (r.city && r.city !== '—' ? r.city : '')).slice(0, 8),
      recent: [...optIns].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    };
  }, [data]);

  const canView = can(user, 'viewOptIns');
  const canService = can(user, 'serviceTracking');

  const columns = [
    { key: 'refId', header: 'Ref ID', width: '18%', render: (r) => <span className="font-semibold text-[var(--ink)]">{r.refId}</span>, title: (r) => r.refId },
    { key: 'employeeName', header: 'Employee', width: '28%' },
    {
      key: 'package',
      header: 'Package',
      width: '22%',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <TierBadge tier={r.tierCode} />
          {r.durationMonths ? <span>{r.durationMonths} m</span> : null}
        </span>
      ),
      title: (r) => `${TIER_LABEL[r.tierCode] || r.packageName} ${r.durationMonths || ''} m`,
    },
    { key: 'createdAt', header: 'Requested', width: '16%', render: (r) => fmtDate(r.createdAt) },
    { key: 'status', header: 'Status', width: '16%', render: (r) => <StatusBadge status={r.status} />, title: (r) => r.status },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={crumbs}
        title="Dashboard"
        info={`Enrolment: ${fmtDate(ENROLMENT.start)} – ${fmtDate(ENROLMENT.end)}`}
        actions={
          <button type="button" className={`${btn.secondary}${btn.sm}`} onClick={refresh} disabled={loading}>
            <HistoryOutlined sx={{ fontSize: 14 }} /> Refresh
          </button>
        }
      />

      <Banner onRetry={refresh}>{data.error}</Banner>

      {loading ? (
        <Spinner label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total opt-ins" value={s.total} />
            <KpiCard label="Pending HR" value={s.pending} />
            <KpiCard label="Sent to Cult.fit" value={s.sent} />
            <KpiCard label="Active" value={s.active} />
            <KpiCard label="Total value (incl. GST)" value={inrLakh(s.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <BarList title="Opt-ins by package" items={s.byTier} />
            <BarList title="By duration" items={s.byDuration} />
            <BarList title="By city" items={s.byCity} />
          </div>

          <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
            <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ink-2)]">
              <WarningAmberOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--warn-text)' }} />
              <span className="font-bold text-[var(--ink)]">Needs attention:</span>
              <span>
                {`${s.pending} pending approval · ${s.expiring30} expiring in 30 days · ${s.issues} activation issues`}
              </span>
            </p>
            {canView ? (
              <button type="button" className={`${btn.primary}${btn.sm}`} onClick={() => go('optins', { status: 'Submitted' })}>
                Review
              </button>
            ) : canService ? (
              <button type="button" className={`${btn.primary}${btn.sm}`} onClick={() => go('service')}>
                Service tracking
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-bold text-[var(--ink)]">Latest requests</p>
              {canView && (
                <button type="button" className={btn.link} onClick={() => go('optins')}>
                  View all
                </button>
              )}
            </div>
            <DataTable columns={columns} rows={s.recent} rowKey={(r) => r._id || r.refId} pageSize={5} minWidth={640} empty="No requests yet." />
          </div>
        </>
      )}
    </div>
  );
}
