import { useEffect, useState } from 'react';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import UnfoldMoreOutlined from '@mui/icons-material/UnfoldMoreOutlined';
import UnfoldLessOutlined from '@mui/icons-material/UnfoldLessOutlined';
import { FAQS } from '../lib/faqs';
import CurrencyRupeeOutlined from '@mui/icons-material/CurrencyRupeeOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import MonitorHeartOutlined from '@mui/icons-material/MonitorHeartOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';

/*
 * Policy tab — summary of the HREPL Corporate Gym Membership Policy + full PDF.
 * The PDF must be placed at: frontend/public/policy/HREPL-Corporate-Gym-Membership-Policy.pdf
 */
const PDF_URL = '/policy/HREPL-Corporate-Gym-Membership-Policy.pdf';
const PDF_NAME = 'HREPL-Corporate-Gym-Membership-Policy.pdf';

/* Local button recipes matching the spec (section 6.2). */
const btnBase = 'inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;
const btnSecondary = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`;

const META = [
  ['Version', '1'],
  ['Effective', '14 Oct 2026'],
  ['Prepared by', 'Suyog Chandak'],
  ['Approved by', 'Adithiya Venkataraman'],
];

const HIGHLIGHTS = [
  { icon: PersonOutlineOutlined, title: 'Voluntary', text: 'Joining or not joining never affects your job, pay, appraisal or other benefits.' },
  { icon: CurrencyRupeeOutlined, title: 'Payroll deduction', text: 'HREPL pays Cult.fit first; you repay through equal monthly salary deductions.' },
  { icon: BlockOutlined, title: 'Non-refundable', text: 'Once submitted or activated, the membership usually cannot be cancelled, refunded or transferred.' },
  { icon: VerifiedUserOutlined, title: 'Your data', text: 'Only what is needed to activate your membership is shared with Cult.fit.' },
];

const SECTIONS = [
  {
    icon: GroupsOutlined,
    title: 'Who can join',
    points: [
      'Active HREPL employees, on-roll and off-roll.',
      'You must be in a city where the chosen membership is available.',
      'You must enrol within the enrolment window and complete all declarations and the payroll authorisation.',
      'Employees serving notice period are not eligible.',
      'HREPL may change eligibility by employee category, location, membership type, enrolment window or budget.',
    ],
  },
  {
    icon: AssignmentOutlined,
    title: 'How enrolment works',
    points: [
      'Choose a membership type and your city or preferred centre.',
      'Submit accurate personal details and accept the data, medical-fitness and payment declarations.',
      'Review Cult.fit’s terms, privacy policy and code of conduct.',
      'Submitting a request does not guarantee activation. Your membership starts only after HREPL or Cult.fit confirms it.',
      'After activation you become a Cult.fit member and manage bookings in the cult.fit app. Services outside the corporate plan may be charged separately.',
    ],
  },
  {
    icon: CurrencyRupeeOutlined,
    title: 'Payment and payroll deduction',
    points: [
      'HREPL pays the membership fee to Cult.fit on your behalf.',
      'The full amount, including taxes and the platform fee, is recovered from your salary in equal monthly instalments.',
      'Small rounding differences are adjusted in the last instalment.',
      'If your salary is not enough in a month, the balance is recovered later or through another lawful method.',
      'You still pay even if you do not use the membership, cannot get bookings, relocate or are unhappy with the service.',
    ],
  },
  {
    icon: BlockOutlined,
    title: 'Cancellation, refund and transfer',
    points: [
      'Once sent to Cult.fit or activated, the enrolment is normally non-cancellable and non-refundable.',
      'The membership cannot be transferred, sold or shared with anyone.',
      'Any exception needs Cult.fit’s terms to allow it and written approval.',
    ],
  },
  {
    icon: LogoutOutlined,
    title: 'If you leave HREPL',
    points: [
      'The entire unpaid balance becomes due immediately.',
      'It may be recovered from your last salary or full-and-final settlement, or you may be asked to pay it directly.',
      'Leaving early does not entitle you to a refund. Access after you leave depends on Cult.fit’s terms.',
    ],
  },
  {
    icon: MonitorHeartOutlined,
    title: 'Medical and fitness declaration',
    points: [
      'You confirm you are medically and physically fit for the activities you choose.',
      'If you have any doubt, condition, recent illness, injury or pregnancy-related concern, get clearance from a doctor first.',
      'Stop and seek help if you feel pain, dizziness or breathing difficulty.',
      'HREPL does not assess or certify your fitness.',
    ],
  },
  {
    icon: VerifiedUserOutlined,
    title: 'Personal data and privacy',
    points: [
      'Shared with Cult.fit only as needed: name, employee ID, email, mobile, city / centre, plan and payment status (gender and address only if required).',
      'HREPL normally receives only aggregated participation figures.',
      'Gym attendance, workout frequency or health data will never be used for your performance, pay, promotion or employment decisions.',
    ],
  },
  {
    icon: PersonOutlineOutlined,
    title: 'Your responsibilities',
    points: [
      'Use the membership only yourself; never share it or your login.',
      'Follow Cult.fit’s rules, safety instructions and trainer guidance, and treat staff and members with respect.',
      'Manage your own bookings and keep your contact details up to date.',
      'Do not record or share Cult.fit’s digital content.',
      'Travel, food and safety arrangements to and from centres are your own; they are not reimbursed.',
    ],
  },
  {
    icon: WarningAmberOutlined,
    title: 'Limits of HREPL’s responsibility',
    points: [
      'Exercise carries risks such as injury, illness or loss of belongings. You take part at your own risk.',
      'HREPL only facilitates the corporate rate; it does not run Cult.fit centres, trainers, equipment or the app.',
      'Centres, classes, timings and app features may change or close at Cult.fit’s discretion.',
      'Cult.fit may suspend your membership for misuse or misconduct; HREPL will not refund in that case.',
    ],
  },
  {
    icon: DescriptionOutlined,
    title: 'Support and incidents',
    points: [
      'Booking, access, app or activation issues: contact Cult.fit support first.',
      'Injury or medical emergency: tell the centre and emergency services immediately, then inform HREPL HR.',
      'Refund requests must be raised directly with Cult.fit.',
    ],
  },
];

function openPdf(download) {
  const link = document.createElement('a');
  link.href = PDF_URL;
  if (download) link.download = PDF_NAME;
  else {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function Policy({ setCurrentView, onBrowse }) {
  const goPackages = () => (onBrowse ? onBrowse() : setCurrentView?.('home'));
  const [pdfMissing, setPdfMissing] = useState(false);
  const [tab, setTab] = useState('policy'); // 'policy' | 'faqs'

  // Vite serves index.html for missing files, so check the response is really a PDF.
  useEffect(() => {
    let alive = true;
    fetch(PDF_URL, { method: 'HEAD' })
      .then((r) => alive && setPdfMissing(!r.ok || !String(r.headers.get('content-type') || '').includes('pdf')))
      .catch(() => alive && setPdfMissing(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">Policy / FAQs</h1>
        <SectionToggle value={tab} onChange={setTab} />
      </div>

      {tab === 'faqs' ? (
        <Faqs onBrowse={goPackages} />
      ) : (
      <>
      {/* Header */}
      <section className="rounded-[12px] p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--action))' }}>
        <p className="text-[11px] font-bold capitalize tracking-[0.33px] opacity-90">HREPL Moves</p>
        <h1 className="mt-1 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px]">Corporate Gym Membership Policy</h1>
        <p className="mt-2 max-w-3xl text-[13px] opacity-95">
          A quick overview of the rules for the Cult.fit corporate membership. Please read the full policy before you
          opt in — by submitting a request you agree to it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openPdf(true)}
            disabled={pdfMissing}
            className={`${btnBase} h-9 rounded-[4px] bg-white px-4 text-[13px] text-[var(--action)] hover:bg-[var(--surface-2)]`}
          >
            <FileDownloadOutlined sx={{ fontSize: 14 }} /> Download full policy (PDF)
          </button>
          <button
            type="button"
            onClick={() => openPdf(false)}
            disabled={pdfMissing}
            className={`${btnBase} h-9 rounded-[4px] border border-white/70 px-4 text-[13px] text-white hover:bg-white/10`}
          >
            <VisibilityOutlined sx={{ fontSize: 14 }} /> View in browser
          </button>
        </div>
      </section>

      {pdfMissing && (
        <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
          <WarningAmberOutlined sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
          <span>
            The full policy PDF was not found. Save it as <b>frontend/public/policy/{PDF_NAME}</b> and refresh the page.
          </span>
        </div>
      )}

      {/* Document details */}
      <dl className="grid grid-cols-2 gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] shadow-[var(--shadow-card)] sm:grid-cols-4">
        {META.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-[var(--muted)]">{k}</dt>
            <dd className="font-semibold text-[var(--ink)]">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Key points */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
            <Icon sx={{ fontSize: 20 }} className="text-[var(--action)]" />
            <p className="mt-2 font-bold text-[var(--ink)]">{title}</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">{text}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        {SECTIONS.map(({ icon: Icon, title, points }, i) => (
          <details key={title} open={i < 3} className="group border-b border-[var(--line-soft)] last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-[var(--surface-2)]">
              <Icon sx={{ fontSize: 18 }} className="shrink-0 text-[var(--action)]" />
              <span className="flex-1 font-semibold text-[var(--ink)]">{title}</span>
              <span className="text-[11px] text-[var(--muted-2)] group-open:hidden">Show</span>
              <span className="hidden text-[11px] text-[var(--muted-2)] group-open:inline">Hide</span>
            </summary>
            <ul className="space-y-2 px-5 pb-4 pl-12 text-[13px] text-[var(--ink-2)]">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <CheckCircleOutlineOutlined sx={{ fontSize: 15 }} className="mt-0.5 shrink-0 text-[var(--success-text)]" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--warn-border)] bg-[var(--warn-soft)] p-4 text-[13px] text-[var(--warn-text)]">
        <p className="max-w-3xl">
          This is a summary only. If anything here differs from the full policy, the full policy applies. This programme is
          a discretionary benefit and HREPL may change or end it.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openPdf(true)}
            className={btnSecondary}
          >
            <FileDownloadOutlined sx={{ fontSize: 14 }} /> Full policy
          </button>
          <button
            type="button"
            onClick={goPackages}
            className={btnPrimary}
          >
            Browse packages
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

/* ── Policy / FAQs toggle (spec 6.5 segmented control) ── */
function SectionToggle({ value, onChange }) {
  const items = [
    { key: 'policy', label: 'Policy', icon: DescriptionOutlined },
    { key: 'faqs', label: 'FAQs', icon: HelpOutlineOutlined },
  ];
  return (
    <div role="tablist" aria-label="Policy or FAQs" className="inline-flex h-[34px] items-center overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)]">
      {items.map(({ key, label, icon: Icon }) => {
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            className={`inline-flex h-8 items-center gap-1.5 px-[14px] text-[12.5px] leading-[19.38px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--action)] ${
              on
                ? 'bg-[var(--segment-active)] font-bold text-[var(--action-hover)]'
                : 'font-semibold text-[var(--grey)] hover:bg-[var(--hover-tint)] hover:text-[var(--action)]'
            }`}
          >
            <Icon sx={{ fontSize: 15 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── FAQs (content from docs/Cult.Fit FAQs.docx, kept in lib/faqs.js) ── */
function Answer({ blocks }) {
  return (
    <div className="space-y-2 text-[13px] leading-[20.15px] text-[var(--ink-2)]">
      {blocks.map((b, i) => {
        if (b.list) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.list.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircleOutlineOutlined sx={{ fontSize: 15 }} className="mt-[3px] shrink-0 text-[var(--action)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.tips) {
          return (
            <ol key={i} className="space-y-1.5">
              {b.tips.map(([title, text], n) => (
                <li key={title} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--action)] text-[11px] font-bold text-white">
                    {n + 1}
                  </span>
                  <span>
                    <b className="text-[var(--ink)]">{title}</b> {text}
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className={b.strong ? 'font-semibold text-[var(--ink)]' : undefined}>
            {b.p}
          </p>
        );
      })}
    </div>
  );
}

const textOf = (f) => [f.q, ...f.a.flatMap((b) => b.list || (b.tips ? b.tips.flat() : [b.p]))].join(' ').toLowerCase();

function Faqs({ onBrowse }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set([0]));
  const term = q.trim().toLowerCase();
  const list = FAQS.map((f, i) => ({ ...f, i })).filter((f) => !term || textOf(f).includes(term));
  const allOpen = list.length > 0 && list.every((f) => open.has(f.i));

  const toggle = (i) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(list.map((f) => f.i)));

  return (
    <div className="space-y-4">
      <section className="rounded-[12px] p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--action))' }}>
        <p className="text-[11px] font-bold capitalize tracking-[0.33px] opacity-90">HREPL Zings × cult.fit</p>
        <h2 className="mt-1 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px]">Frequently Asked Questions</h2>
        <p className="mt-2 max-w-3xl text-[13px] opacity-95">
          Answers to common questions about the corporate membership: payment, activation, eligibility, cancellation and more.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <SearchOutlined
            sx={{ fontSize: 15 }}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
          />
          <input
            className="h-9 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-[13px] text-[var(--ink)] outline-none transition-colors duration-[120ms] placeholder:text-[var(--muted-2)] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)]"
            placeholder="Search the FAQs, e.g. payroll, cancel, family"
            aria-label="Search FAQs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className={btnSecondary} onClick={toggleAll} disabled={!list.length}>
          {allOpen ? <UnfoldLessOutlined sx={{ fontSize: 14 }} /> : <UnfoldMoreOutlined sx={{ fontSize: 14 }} />}
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        {list.map((f) => {
          const isOpen = open.has(f.i);
          const id = `faq-${f.i}`;
          return (
            <div key={f.i} className="border-b border-[var(--line-soft)] last:border-b-0">
              <h3>
                <button
                  type="button"
                  id={`${id}-q`}
                  aria-expanded={isOpen}
                  aria-controls={`${id}-a`}
                  onClick={() => toggle(f.i)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--action)]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy-tint)] text-[12px] font-bold text-[var(--brand)]">
                    {f.i + 1}
                  </span>
                  <span className="flex-1 text-[14px] font-semibold text-[var(--ink)]">{f.q}</span>
                  <ExpandMoreOutlined
                    sx={{ fontSize: 18 }}
                    className="shrink-0 text-[var(--muted-2)] transition-transform duration-150"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
              </h3>
              {isOpen && (
                <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className="px-5 pb-4 pl-14">
                  <Answer blocks={f.a} />
                </div>
              )}
            </div>
          );
        })}
        {!list.length && <p className="px-5 py-8 text-center text-[13px] text-[var(--muted)]">No FAQs match “{q.trim()}”.</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-2)] shadow-[var(--shadow-card)]">
        <p>Still have a question? Booking, app and activation issues go to cult.fit support first; anything else, contact HR.</p>
        <button type="button" onClick={onBrowse} className={btnPrimary}>
          Browse packages
        </button>
      </div>
    </div>
  );
}
