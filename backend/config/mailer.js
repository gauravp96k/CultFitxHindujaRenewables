/*
 * Sends OTP emails.
 *
 * MAIL_PROVIDER=graph  (recommended for Microsoft 365) — Microsoft Graph sendMail with an Entra app
 *                       (OAuth client credentials). Not affected by the SMTP AUTH Basic retirement.
 * MAIL_PROVIDER=smtp   — any SMTP server (Nodemailer). For Microsoft 365, password SMTP is disabled
 *                       by default from end of December 2026, so use only as a fallback.
 * Not set              — picks graph if GRAPH_* is filled in, else smtp if SMTP_* is filled in.
 *
 * In development with nothing configured, the auth controller prints the OTP to the console instead.
 */
const nodemailer = require('nodemailer');

const env = (k, d = '') => (process.env[k] || d).trim();
const TIMEOUT_MS = 10000;

/* ───────────── settings ───────────── */
function graphCfg() {
  return {
    tenantId: env('GRAPH_TENANT_ID'),
    clientId: env('GRAPH_CLIENT_ID'),
    clientSecret: env('GRAPH_CLIENT_SECRET'),
    sender: env('GRAPH_SENDER') || env('MAIL_FROM_ADDRESS'),
  };
}
function smtpCfg() {
  const port = Number(env('SMTP_PORT') || env('EMAIL_PORT') || 587);
  return {
    service: env('EMAIL_SERVICE'),
    host: env('SMTP_HOST') || env('EMAIL_HOST'),
    port,
    secure: env('SMTP_SECURE') === 'true' || port === 465,
    user: env('SMTP_USER') || env('EMAIL_USER'),
    pass: env('SMTP_PASS') || env('EMAIL_PASS'),
  };
}
const graphReady = () => { const g = graphCfg(); return Boolean(g.tenantId && g.clientId && g.clientSecret && g.sender); };
const smtpReady = () => { const s = smtpCfg(); return Boolean((s.host || s.service) && s.user && s.pass); };

function provider() {
  const p = env('MAIL_PROVIDER').toLowerCase();
  if (p === 'graph' || p === 'smtp') return p;
  if (graphReady()) return 'graph';
  if (smtpReady()) return 'smtp';
  return 'none';
}

const isMailConfigured = () => {
  const p = provider();
  return (p === 'graph' && graphReady()) || (p === 'smtp' && smtpReady());
};

const fromName = () => env('MAIL_FROM_NAME', 'HREPL Wellness');

/* ───────────── Microsoft Graph ───────────── */
let tokenCache = { value: null, expiresAt: 0 };

async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? `Request timed out: ${url}` : e.message);
  } finally {
    clearTimeout(t);
  }
}

async function graphToken(force = false) {
  if (!force && tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const g = graphCfg();
  const res = await fetchWithTimeout(`https://login.microsoftonline.com/${encodeURIComponent(g.tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: g.clientId,
      client_secret: g.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Graph token request failed (${res.status}): ${data.error_description || data.error || 'unknown error'}`);
  }
  tokenCache = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in || 3600) - 120) * 1000 };
  return tokenCache.value;
}

async function sendViaGraph({ to, subject, html, text }) {
  const g = graphCfg();
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(g.sender)}/sendMail`;
  const body = JSON.stringify({
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: false,
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const token = await graphToken();
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    });
    if (res.status === 202) return;

    const err = await res.json().catch(() => ({}));
    const msg = (err.error && (err.error.code + ': ' + err.error.message)) || res.statusText;

    if (res.status === 401 && attempt === 1) { await graphToken(true); continue; } // expired/revoked token
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = Math.min(Number(res.headers.get('retry-after')) || attempt, 5);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`Graph sendMail failed (${res.status}) ${msg}`);
  }
  throw new Error('Graph sendMail failed after retries');
}

/* ───────────── SMTP ───────────── */
let transporter = null;
function smtpTransport() {
  if (transporter) return transporter;
  const s = smtpCfg();
  const auth = { user: s.user, pass: s.pass };
  transporter = nodemailer.createTransport(
    s.service
      ? { service: s.service, auth }
      : { host: s.host, port: s.port, secure: s.secure, requireTLS: !s.secure, auth, connectionTimeout: TIMEOUT_MS, greetingTimeout: TIMEOUT_MS, socketTimeout: TIMEOUT_MS }
  );
  return transporter;
}

async function sendViaSmtp({ to, subject, html, text }) {
  const from = env('MAIL_FROM') || `${fromName()} <${smtpCfg().user}>`;
  await smtpTransport().sendMail({ from, to, subject, html, text });
}

/* ───────────── public API ───────────── */
async function sendMail(message) {
  const p = provider();
  if (p === 'graph') return sendViaGraph(message);
  if (p === 'smtp') return sendViaSmtp(message);
  throw new Error('Email is not configured (set MAIL_PROVIDER and GRAPH_* or SMTP_* in .env)');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function sendOtpEmail(to, code, minutes) {
  const subject = `${code} is your HREPL Wellness login code`;
  const text = [
    `Your one-time password is ${code}.`,
    `It is valid for ${minutes} minutes and can be used once.`,
    '',
    'Never share this code. HR and IT will never ask for it.',
    'If you did not try to sign in, you can ignore this email.',
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F8FAF9;font-family:Segoe UI,Arial,sans-serif;color:#22293A">
  <table role="presentation" width="100%" style="max-width:480px;margin:auto;background:#FFFFFF;border:1px solid #D1D1D1;border-radius:12px">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #E4E9EE;font-weight:700">HREPL × cult.fit Corporate Wellness</td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 12px">Use this one-time password to sign in:</p>
      <p style="margin:0 0 16px;font-size:30px;font-weight:700;letter-spacing:8px">${esc(code)}</p>
      <p style="margin:0 0 8px">It is valid for <b>${esc(minutes)} minutes</b> and can be used once.</p>
      <p style="margin:0;color:#4B5563;font-size:13px">Never share this code. HR and IT will never ask for it. If you did not try to sign in, you can ignore this email.</p>
    </td></tr>
  </table></body></html>`;
  await sendMail({ to, subject, html, text });
}

/** Checks the mail settings work (gets a Graph token, or logs in to SMTP). Used at startup and by the test script. */
async function verifyMailer() {
  const p = provider();
  if (p === 'graph') {
    if (!graphReady()) throw new Error('MAIL_PROVIDER=graph but GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET or GRAPH_SENDER is missing');
    await graphToken(true);
    return `Microsoft Graph (sender ${graphCfg().sender})`;
  }
  if (p === 'smtp') {
    if (!smtpReady()) throw new Error('MAIL_PROVIDER=smtp but SMTP_HOST, SMTP_USER or SMTP_PASS is missing');
    await smtpTransport().verify();
    return `SMTP ${smtpCfg().host || smtpCfg().service} as ${smtpCfg().user}`;
  }
  throw new Error('No email provider configured');
}

module.exports = { sendOtpEmail, sendMail, isMailConfigured, verifyMailer, provider };
