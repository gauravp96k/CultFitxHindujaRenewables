import { useEffect, useState } from 'react';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import { requestService } from '../services/api';
import { DEDUCTION_MONTHS, STEPS, asList, errText, fmtDate, inr, months, normaliseRequest } from '../lib/wellness';
import { Banner, Empty, GstPill, Spinner, StatusBadge, btn, card } from '../components/ui';

/* Wizard-style stepper, following the spec's wizard number circles (section 6.8). */
function Stepper({ status }) {
  if (!STEPS.includes(status)) return null;
  const idx = STEPS.indexOf(status);
  return (
    <ol className="my-4 flex flex-wrap items-center gap-1 text-[11px]">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className="flex flex-1 items-center gap-1.5">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: done ? 'var(--action)' : 'var(--step-pending)' }}
            >
              {i < idx ? <CheckOutlined sx={{ fontSize: 14 }} /> : i + 1}
            </span>
            <span className={done ? 'font-bold text-[var(--ink)]' : 'text-[var(--muted)]'}>{s}</span>
            {i < STEPS.length - 1 && (
              <span
                className="h-[2px] min-w-4 flex-1"
                style={{ background: i < idx ? 'var(--action)' : 'var(--step-line)' }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function MyRequests({ setCurrentView }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    requestService
      .getMyRequests()
      .then((res) => setItems(asList(res?.data, 'requests').map(normaliseRequest)))
      .catch((err) => setError(errText(err, 'Could not load your requests')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-4 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">My Requests</h2>
      <Banner onRetry={load}>{error}</Banner>

      {loading ? (
        <Spinner />
      ) : !items.length ? (
        <Empty icon={AssignmentOutlined} title="No opt-in requests submitted yet">
          <button type="button" className={`${btn.primary} mt-3`} onClick={() => setCurrentView?.('home')}>
            Browse packages
          </button>
        </Empty>
      ) : (
        items.map((r) => {
          const savings = Math.max(0, r.mrp - r.price);
          const rows = [
            ['Reference ID', <b key="r">{r.refId}</b>],
            ['Package', <b key="p">{r.packageName}</b>],
            ['Duration', r.durationMonths ? months(r.durationMonths) : '—'],
            ['City', r.city],
            r.mrp > 0 && ['MRP', <s key="m" className="text-[var(--muted-2)]">{inr(r.mrp)}</s>],
            ['Corporate price', <span key="c" className="inline-flex items-center gap-2"><b className="text-[var(--brand)]">{inr(r.price)}</b> <GstPill>Inclusive of GST</GstPill></span>],
            r.mrp > 0 && ['You save', inr(savings)],
            ['Payroll deduction', `${inr(r.monthlyDeduction)} × ${DEDUCTION_MONTHS} months`],
            r.form?.preferredCentre && ['Preferred centre', r.form.preferredCentre],
            r.form?.preferredStartDate && ['Preferred start', fmtDate(r.form.preferredStartDate)],
            ['Request date', fmtDate(r.createdAt)],
            ['Status', <StatusBadge key="s" status={r.status} />],
            r.memberId && ['Cult.fit member ID', <b key="id">{r.memberId}</b>],
          ].filter(Boolean);

          return (
            <section key={r._id || r.refId} className={`${card} mb-4`}>
              <h3 className="text-[13.5px] font-bold text-[var(--ink)]">Request Summary</h3>
              <Stepper status={r.status} />
              {r.status === 'Rejected' && (
                <Banner>This request was not approved{r.rejectionReason ? `: ${r.rejectionReason}` : '.'} Contact HR for details.</Banner>
              )}
              <dl className="divide-y divide-[var(--line-soft)] text-[13px]">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[45%_1fr] gap-2 py-1.5">
                    <dt className="text-[var(--muted)]">{k}</dt>
                    <dd className="text-[var(--ink)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })
      )}
    </div>
  );
}
