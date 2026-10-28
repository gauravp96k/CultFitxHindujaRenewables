/* This module intentionally shares class recipes (btn, input, …) and the useToast hook with its
   components, so the fast-refresh "components only" rule doesn't apply here. */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import { STATUS_STYLE, TIER_LABEL, TIER_STYLE } from '../lib/wellness';

/* =========================================================================
   Shared UI primitives — built to the ACH UI/UX Build Spec (section 6).
   Colours come from the design tokens in index.css; nothing is hard-coded
   outside the token set. Icons are Material Outlined from @mui/icons-material.
   ========================================================================= */

/* A small spinner kept on-brand (CSS border animation, no icon set). */
export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-[13px]" style={{ color: 'var(--muted)' }}>
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    {label}
  </div>
);

/* ── 6.2 Buttons ─────────────────────────────────────────────────────── */
const btnBase =
  'inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';

export const btn = {
  // Primary — action blue, 36px, radius 4, 13px/700 white
  primary: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`,
  // Secondary (ghost) — white, 1px line, ink-2 label
  secondary: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`,
  // Danger — stays red on hover
  danger: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-white bg-[var(--danger)] hover:bg-[var(--danger-hover)]`,
  // Small ghost — 30px, 12px/700
  smallGhost: `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] leading-[18.6px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`,
  // Text button (Cancel / Back) — 36px, action label, hover fill
  text: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-[var(--action)] border border-transparent hover:text-[var(--action-hover)] hover:bg-[var(--text-btn-hover-bg)] hover:border-[var(--text-btn-hover-border)]`,
  // Link button (Reset / Clear) — no box, underlined brand
  link: 'inline-flex items-center text-[12px] font-bold leading-[18.6px] text-[var(--brand)] underline underline-offset-2 hover:text-[var(--action-hover)]',

  // Back-compat aliases used by existing pages (map to the new system)
  outline: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-[var(--ink-2)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`,
  dark: `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-white bg-[var(--brand)] hover:bg-[var(--action-hover)]`,
  ghost: `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] leading-[18.6px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]`,
  sm: ' !h-[30px] !px-3 !text-[12px]',
};

/* ── 6.7 / 6.11 Card ─────────────────────────────────────────────────── */
export const card =
  'rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]';

/* ── 6.4 Inputs ──────────────────────────────────────────────────────── */
// Standard field input: 38px, radius 10, 14px, line border; focus = brand + ring.
export const input =
  'w-full h-[38px] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[14px] leading-[21.7px] text-[var(--ink)] outline-none transition-colors duration-[120ms] placeholder:text-[var(--muted-2)] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)] disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)]';

// Field label: 11px/700, capitalize, muted.
export const labelCls =
  'mb-1.5 block text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]';

/* ── 6.7 Table cells ─────────────────────────────────────────────────── */
export const th =
  'bg-[var(--surface-2)] px-[18px] py-[10px] text-left text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]';
export const td =
  'px-[18px] py-[7px] align-top text-[12.5px] leading-[19.38px] text-[var(--muted)]';

/* ── 6.11 Banner / notes ─────────────────────────────────────────────── */
export function Banner({ type = 'error', children, onRetry }) {
  if (!children) return null;
  const styles = {
    error:
      'border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-text)]',
    success:
      'border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success-text)]',
    warn: 'border-[var(--warn-border)] bg-[var(--warn-soft)] text-[var(--warn-text)]',
  };
  const Icon =
    type === 'success' ? CheckCircleOutlineOutlined : type === 'warn' ? WarningAmberOutlined : ErrorOutlineOutlined;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`my-3 flex items-start gap-2 rounded-[8px] border px-3 py-2.5 text-[12.5px] leading-[19.38px] ${styles[type]}`}
    >
      <Icon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center">
    {Icon && <Icon sx={{ fontSize: 28 }} className="mx-auto mb-2 text-[var(--muted-2)]" />}
    <p className="text-[14px] font-bold text-[var(--ink)]">{title}</p>
    {children && <div className="mt-1 text-[13px] text-[var(--muted)]">{children}</div>}
  </div>
);

/* ── 6.5 Badges ──────────────────────────────────────────────────────── */
export const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { color: 'var(--grey)', bg: 'var(--surface-3)' };
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold leading-[17.05px]"
      style={{ color: s.color, background: s.bg }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {status}
    </span>
  );
};

export const TierBadge = ({ tier }) => {
  const s = TIER_STYLE[tier] || TIER_STYLE.OTHER;
  return (
    <span
      className="inline-flex rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold leading-[17.05px]"
      style={{ color: s.color, background: s.bg }}
    >
      {TIER_LABEL[tier] || tier}
    </span>
  );
};

export const GstPill = ({ children = 'Inclusive of GST' }) => (
  <span className="inline-flex items-center gap-1 rounded-[999px] bg-[var(--success-soft)] px-[9px] py-[3px] text-[11px] font-bold leading-[17.05px] text-[var(--success-text)]">
    <CheckOutlined sx={{ fontSize: 13 }} />
    {children}
  </span>
);

/* ── 6.5 Chip (used as a filter pill) ────────────────────────────────── */
export const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`m-0.5 inline-flex items-center rounded-[999px] px-[11px] py-[5px] text-[12px] font-bold leading-[18.6px] transition-colors duration-[120ms] ${
      active
        ? 'bg-[var(--brand)] text-white'
        : 'bg-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--navy-tint)] hover:text-[var(--brand)]'
    }`}
  >
    {children}
  </button>
);

/* ── 6.4 Field wrapper ───────────────────────────────────────────────── */
export const Field = ({ label, required, error, hint, className = '', children }) => (
  <div className={className}>
    {label && (
      <label className={labelCls}>
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="mt-1 text-[11px] font-medium leading-[14.3px] text-[var(--muted)]">{hint}</p>}
    {error && <p className="mt-1.5 text-[11.5px] font-semibold leading-[17.83px] text-[var(--danger)]">{error}</p>}
  </div>
);

/* ── 4.5 / 6.12 Modal (generic shell) ────────────────────────────────── */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, newest last. Only the topmost one reacts to Escape / Tab, so a dialog
// opened on top of another (e.g. a confirm over a form) doesn't close both.
const dialogStack = [];

/** Spec rule 6: focus moves in, Tab is trapped, focus returns on close, Escape cancels. */
function useDialogFocus(open, panelRef, onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const me = {};
    dialogStack.push(me);
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE);
      (first || panelRef.current)?.focus();
    }, 0);
    const onKey = (e) => {
      if (dialogStack[dialogStack.length - 1] !== me) return; // not the top dialog
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const i = dialogStack.indexOf(me);
      if (i !== -1) dialogStack.splice(i, 1);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, panelRef]);
}

export function Modal({ open, onClose, title, children, footer, size = 'md', icon: Icon }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(open, panelRef, onClose);
  if (!open) return null;
  // Spec 4.5 modal widths
  const width = { sm: 'max-w-[460px]', md: 'max-w-[640px]', lg: 'max-w-[880px]', xl: 'max-w-[960px]' }[size] || 'max-w-[640px]';
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'var(--scrim)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full ${width} flex-col rounded-[12px] bg-[var(--surface)] shadow-[var(--shadow-overlay)] outline-none`}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <h3 id={titleId} className="flex items-center gap-2 text-[12px] font-bold leading-[18.6px] text-[var(--ink)]">
            {Icon && <Icon sx={{ fontSize: 16 }} style={{ color: 'var(--action)' }} />}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[var(--muted)] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
          >
            <CloseOutlined sx={{ fontSize: 16 }} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-2 text-[13px] leading-[20.15px] text-[var(--ink-2)]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 rounded-b-[12px] border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Button that opens a file picker and calls onFile(file). */
export function FileButton({ onFile, accept = '.csv', className = btn.secondary, icon: Icon = null, children }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      await onFile(f);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} hidden onChange={handle} />
      <button type="button" className={className} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? (
          <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          Icon && <Icon sx={{ fontSize: 14 }} />
        )}
        {children}
      </button>
    </>
  );
}

/* KPI summary card (summary block, section 6.11) */
export function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-[18px] py-4 text-center shadow-[var(--shadow-card)]">
      <div className="text-[22px] font-extrabold leading-[1.1] text-[var(--brand)]">{value}</div>
      <div className="mt-1 text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[var(--muted-2)]">{hint}</div>}
    </div>
  );
}

/* Horizontal bar list (uses the matrix progress-bar navy fill) */
export function BarList({ title, items = [] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={card}>
      <p className="mb-3 text-[13.5px] font-bold text-[var(--ink)]">{title}</p>
      {!items.length && <p className="text-[12px] text-[var(--muted-2)]">No data yet</p>}
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label}>
            <div className="flex justify-between text-[12px]">
              <span className="text-[var(--ink-2)]">{i.label}</span>
              <span className="font-bold text-[var(--ink)]">{i.value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-[999px] bg-[var(--surface-3)]">
              <div
                className="h-1.5 rounded-[999px]"
                style={{ width: `${(i.value / max) * 100}%`, background: 'linear-gradient(90deg, var(--brand), var(--action))' }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 6.6 Toggle (38x21, knob 17px, on = --toggle-on) ─────────────────── */
export function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative inline-flex h-[21px] w-[38px] shrink-0 items-center rounded-[999px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action)] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: checked ? 'var(--toggle-on)' : 'var(--line)' }}
    >
      <span
        aria-hidden="true"
        className="absolute h-[17px] w-[17px] rounded-full bg-white shadow transition-[left] duration-150"
        style={{ left: checked ? 19 : 2 }}
      />
    </button>
  );
}

/* ── Confirm dialog (spec rule 6: destructive red button first, Cancel last) ── */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = true, busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className={danger ? btn.danger : btn.primary} disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button type="button" className={btn.text} onClick={onCancel}>
            Cancel
          </button>
        </>
      }
    >
      <div className="py-2">{children}</div>
    </Modal>
  );
}

/* ── 7 Toast: bottom-centre, --tooltip background, fades after 2.6s ───── */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-[8px] px-4 py-[9px] text-[12.5px] font-medium text-white shadow-[var(--shadow-tooltip)]"
          style={{ background: 'var(--tooltip)' }}
        >
          <CheckOutlined sx={{ fontSize: 13 }} />
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** const toast = useToast(); toast('Saved'); */
export const useToast = () => useContext(ToastContext);

/* ── Page header: breadcrumb (Home > …) + H1 + optional actions ──────── */
export function PageHeader({ crumbs = [], title, info, actions, children }) {
  return (
    <div className="mb-4">
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-[12.5px] leading-[19.38px]">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--muted-2)]">/</span>}
              {c.onClick ? (
                <button type="button" onClick={c.onClick} className="inline-flex items-center gap-1 font-semibold text-[var(--brand)] hover:underline">
                  {i === 0 && <HomeOutlined sx={{ fontSize: 14 }} />}
                  {c.label}
                </button>
              ) : (
                <span className="text-[var(--muted-2)]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">
          {title}
          {info && <span className="ml-2 align-middle text-[12px] font-normal tracking-normal text-[var(--muted)]">{info}</span>}
        </h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Annotation / note under a section (warning-note look, used for hints) ── */
export const Note = ({ children }) => (
  <p className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-soft)] px-3 py-2.5 text-[12.5px] leading-[19.38px] text-[var(--warn-text)]">
    {children}
  </p>
);

/* ── Row action icon button (26x26, radius 6) ─────────────────────────── */
export function IconButton({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-[6px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action)] disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-hover)]'
          : 'text-[var(--action)] hover:bg-[var(--hover-tint)] hover:text-[var(--action-hover)]'
      }`}
    >
      <Icon sx={{ fontSize: 16 }} />
    </button>
  );
}

/* ── Export button (TableViewOutlined 16px in --excel green) ──────────── */
export const exportBtn = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] leading-[20.15px] text-[var(--excel)] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-2)]`;
