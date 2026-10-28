import { useEffect, useRef, useState } from 'react';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import SelfImprovementOutlined from '@mui/icons-material/SelfImprovementOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* Login — corporate navy brand (ACH build spec). Left brand panel, right sign-in card. */

const DOMAIN = '@hindujarenewables.com';
const RESEND_SECONDS = 30;
const SSO_URL = import.meta.env.VITE_DARWINBOX_SSO_URL; // set when Darwinbox SSO is live

const FEATURES = [
  { Icon: FitnessCenterOutlined, title: 'Gym access', sub: 'ELITE & PRO centres' },
  { Icon: SelfImprovementOutlined, title: 'Group classes', sub: 'Yoga, HRX, Boxing' },
  { Icon: PaymentsOutlined, title: 'Corporate rates', sub: 'GST included · payroll deduction' },
];

const getError = (err, fallback) => {
  if (!err?.response) return 'Cannot reach the server. Please check your connection and try again.';
  return err.response.data?.error || err.response.data?.message || fallback;
};

const inputCls =
  'w-full h-10 rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] leading-[20.15px] text-[var(--ink)] outline-none transition-colors duration-[120ms] placeholder:text-[var(--muted-2)] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)] disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)]';

export default function Login({ onSuccess }) {
  const { login } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(''); // '' | 'send' | 'verify'
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef(null);
  const otpRef = useRef(null);

  // Resend countdown
  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const email = emailInput.trim().toLowerCase();

  const handleSendOtp = async () => {
    setAuthError('');
    setInfo('');
    if (!/^[^\s@]+@[^\s@]+$/.test(email) || !email.endsWith(DOMAIN)) {
      setAuthError(`Please use your official ${DOMAIN} email ID`);
      emailRef.current?.focus();
      return;
    }
    setLoading('send');
    try {
      const res = await authService.sendOtp(email);
      setOtpSent(true);
      setOtpInput('');
      setCooldown(res?.data?.resendIn || RESEND_SECONDS);
      setInfo(`OTP sent to ${email}. It is valid for 5 minutes.`);
      setTimeout(() => otpRef.current?.focus(), 0);
    } catch (err) {
      const wait = err?.response?.data?.resendIn;
      if (wait) setCooldown(wait);
      setAuthError(getError(err, 'Failed to send OTP'));
    } finally {
      setLoading('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpSent) return handleSendOtp();
    setAuthError('');
    if (!/^\d{6}$/.test(otpInput)) {
      setAuthError('Enter the 6-digit OTP');
      otpRef.current?.focus();
      return;
    }
    setLoading('verify');
    try {
      const res = await authService.verifyOtp(email, otpInput);
      login(res.data.token, res.data.user);
      onSuccess?.(res.data.user?.role);
    } catch (err) {
      setOtpInput('');
      setInfo('');
      setAuthError(getError(err, 'Invalid OTP'));
      otpRef.current?.focus();
    } finally {
      setLoading('');
    }
  };

  const resetEmail = () => {
    setOtpSent(false);
    setOtpInput('');
    setCooldown(0);
    setAuthError('');
    setInfo('');
    setTimeout(() => emailRef.current?.focus(), 0);
  };

  const goToSso = () => {
    if (SSO_URL) window.location.assign(SSO_URL);
  };

  const spin = (
    <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );

  return (
    <div className="grid min-h-screen bg-[var(--bg)] text-[var(--ink)] lg:grid-cols-[1.2fr_1fr]">
      {/* ── Brand panel (left) ── */}
      <section
        className="flex flex-col justify-center px-8 py-12 text-white sm:px-[60px] lg:py-[60px]"
        style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--topbar) 55%, var(--action) 140%)' }}
      >
        <div className="text-[22px] font-bold">
          HREPL <span style={{ color: 'var(--action)' }}>×</span> cult.fit
        </div>
        <h1 className="mb-2 mt-5 text-[30px] font-bold leading-tight sm:text-[38px]">
          Corporate Wellness
          <br />
          Membership Portal
        </h1>
        <p className="text-[14px] text-white/90 sm:text-[15px]">
          Exclusive corporate pricing on gym &amp; fitness memberships for HREPL employees.
        </p>
        <ul className="mt-[30px] grid max-w-[540px] gap-4 sm:grid-cols-3">
          {FEATURES.map(({ Icon, title, sub }) => (
            <li key={title} className="flex flex-col gap-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-white/[.14]">
                <Icon sx={{ fontSize: 18 }} />
              </span>
              <span className="text-[13px] font-bold">{title}</span>
              <span className="text-[12px] text-white/80">{sub}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Sign-in card (right) ── */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px] rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">Sign In</h2>

          {/* SSO — enabled only when VITE_DARWINBOX_SSO_URL is set */}
          <button
            type="button"
            onClick={goToSso}
            disabled={!SSO_URL}
            title={SSO_URL ? 'Sign in with Darwinbox' : 'Darwinbox SSO is not configured yet'}
            className="mb-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[4px] bg-[var(--action)] px-4 text-[13px] font-bold leading-[20.15px] text-white transition-colors duration-[120ms] hover:bg-[var(--action-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockOutlined sx={{ fontSize: 14 }} /> Continue With Darwinbox (SSO)
          </button>

          <div className="my-2 text-center text-[11px] text-[var(--muted-2)]">— or sign in with official email —</div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]">
              Official Email ID <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`name${DOMAIN}`}
              value={emailInput}
              disabled={otpSent}
              onChange={(e) => setEmailInput(e.target.value)}
              className={`${inputCls} mb-1`}
            />
            {otpSent ? (
              <button type="button" onClick={resetEmail} className="mb-2 text-[11px] font-bold text-[var(--action)] hover:underline">
                ← Use a different email
              </button>
            ) : (
              <div className="mb-2" />
            )}

            {/* OTP + Send OTP */}
            <label htmlFor="otp" className="mb-1.5 block text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]">
              OTP
            </label>
            <div className="mb-3 flex gap-2">
              <input
                id="otp"
                ref={otpRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otpInput}
                disabled={!otpSent}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputCls} tracking-[0.25em]`}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading === 'send' || cooldown > 0 || !emailInput.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[12px] font-bold text-[var(--ink-2)] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === 'send' && spin}
                {cooldown > 0 ? `Resend in ${cooldown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>

            {/* Messages */}
            {authError && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-2.5 text-[12.5px] leading-[19.38px] text-[var(--danger-text)]"
              >
                <ErrorOutlineOutlined sx={{ fontSize: 15 }} className="mt-0.5 shrink-0" /> {authError}
              </div>
            )}
            {info && !authError && (
              <div
                role="status"
                className="mb-3 flex items-start gap-2 rounded-[8px] border border-[var(--success-soft)] bg-[var(--success-soft)] p-2.5 text-[12.5px] leading-[19.38px] text-[var(--success-text)]"
              >
                <CheckCircleOutlineOutlined sx={{ fontSize: 15 }} className="mt-0.5 shrink-0" /> {info}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={Boolean(loading) || (otpSent && otpInput.length !== 6)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[4px] bg-[var(--action)] px-4 text-[13px] font-bold leading-[20.15px] text-white transition-colors duration-[120ms] hover:bg-[var(--action-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === 'verify' && spin}
              {otpSent ? 'Login' : 'Send OTP'}
            </button>
          </form>

          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Super Admin and sub-admins are sent to the HR Admin console according to their access.
          </p>
        </div>
      </section>
    </div>
  );
}
