const DEDUCTION_MONTHS = 3;
const DEFAULT_PLATFORM_FEE = 80;

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const date = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const dateTime = (v) => {
  const d = v ? new Date(v) : new Date();
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const months = (d) => (d ? `${d} month${Number(d) === 1 ? '' : 's'}` : '—');
const show = (v) => (v === undefined || v === null || String(v).trim() === '' ? '—' : v);

function rowsHtml(rows) {
  return rows
    .filter(Boolean)
    .map(([k, v, strong]) => `<tr><th>${esc(k)}</th><td${strong ? ' class="strong"' : ''}>${esc(show(v))}</td></tr>`)
    .join('');
}

export function buildAcknowledgementHtml({ refId, createdAt, user = {}, plan = {}, form = {} }) {
  const price = Number(plan.corporatePriceInclGst ?? plan.corporatePrice ?? plan.price) || 0;
  const fee = plan.platformFee === undefined || plan.platformFee === null ? DEFAULT_PLATFORM_FEE : Number(plan.platformFee) || 0;
  const monthly = Number(plan.monthlyDeduction) || Math.round(price / DEDUCTION_MONTHS);
  const mrp = Number(plan.mrp) || 0;
  const ref = refId || '—';
  const mobile = String(form.mobileOnCultApp || '').replace(/[\s-]/g, '');

  const employee = rowsHtml([
    ['Employee name', user.fullName || user.name],
    ['Employee ID', user.employeeId || user.empId],
    ['Official email', user.email || user.officialEmail],
    ['Work location', user.location || user.workLocation],
    ['Mobile (Cult.fit app)', mobile],
  ]);

  const membership = rowsHtml([
    ['Package', plan.packageName, true],
    ['Duration', months(plan.durationMonths)],
    ['City', plan.city],
    plan.accessLabel && ['Gym access', plan.accessLabel],
    plan.inclusions && ['Inclusions', plan.inclusions],
    mrp > price && ['MRP', inr(mrp)],
    ['Corporate price (incl. GST)', inr(price), true],
    ['Platform fee', `${inr(fee)} per user (charged additionally)`],
    ['Payroll deduction', `${inr(monthly)} per month for ${DEDUCTION_MONTHS} months`],
  ]);

  const preferences = rowsHtml([
    ['Preferred centre', form.preferredCentre || 'No preference'],
    ['Preferred start date', date(form.preferredStartDate)],
    ['Existing Cult.fit member', form.isExistingMember],
  ]);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HREPL-Wellness-Acknowledgement-${esc(ref)}</title>
<style>
  @page { size: A4; margin: 16mm 16mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font: 12px/1.5 "Segoe UI", Arial, sans-serif; color: #2B2B2B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; border-bottom: 3px solid #D71920; }
  .brand { font-size: 18px; font-weight: 800; color: #111111; }
  .brand span { color: #D71920; }
  .sub { font-size: 11px; color: #6B6B6B; }
  .ref { text-align: right; }
  .ref b { display: block; font-size: 15px; color: #111111; }
  h1 { font-size: 17px; margin: 18px 0 4px; }
  .lead { margin: 0 0 14px; color: #4A4A4A; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #FCE6E7; color: #B3141A; font-weight: 700; font-size: 11px; }
  h2 { font-size: 12.5px; margin: 16px 0 6px; padding: 5px 8px; background: #F2F2F2; border-left: 3px solid #D71920; text-transform: uppercase; letter-spacing: .4px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #E6E6E6; }
  th { width: 38%; font-weight: 600; color: #4A4A4A; }
  td.strong { font-weight: 700; color: #111111; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  li { margin: 3px 0; }
  .note { margin-top: 16px; padding: 8px 10px; border: 1px solid #fcd34d; background: #fffbeb; color: #78350f; border-radius: 6px; font-size: 11px; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #E6E6E6; font-size: 10px; color: #6B6B6B; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">HREPL <span>× cult.fit</span></div>
      <div class="sub">Corporate Wellness Programme · HREPL Moves</div>
    </div>
    <div class="ref">
      <span class="sub">Reference ID</span>
      <b>${esc(ref)}</b>
      <span class="sub">Submitted ${esc(dateTime(createdAt))}</span>
    </div>
  </div>

  <h1>Membership Opt-in Acknowledgement</h1>
  <p class="lead">Your Cult.fit corporate membership request has been received. Status: <span class="status">Submitted</span></p>

  <h2>Employee details</h2>
  <table>${employee}</table>

  <h2>Membership details</h2>
  <table>${membership}</table>

  <h2>Preferences</h2>
  <table>${preferences}</table>

  <h2>Declarations accepted</h2>
  <ul>
    <li>Read and accepted the HREPL Corporate Gym Membership Policy.</li>
    <li>Consented to share the required personal data with Cult.fit for activation.</li>
    <li>Authorised payroll deduction of ${esc(inr(monthly))} per month for ${DEDUCTION_MONTHS} months, plus the platform fee.</li>
    <li>Confirmed medical and physical fitness to participate.</li>
  </ul>

  <h2>What happens next</h2>
  <ul>
    <li>HR reviews your request and sends it to Cult.fit.</li>
    <li>Cult.fit sends the activation link by SMS to ${esc(mobile || 'your registered mobile number')}.</li>
    <li>Your membership validity starts from the activation date. Track the status under My Requests.</li>
  </ul>

  <div class="note">Submitting a request does not guarantee activation. Once sent to Cult.fit or activated, the membership is normally non-cancellable, non-refundable and non-transferable, as per the policy.</div>

  <div class="foot">
    <span>System-generated acknowledgement. No signature required.</span>
    <span>Generated ${esc(dateTime())}</span>
  </div>
</body>
</html>`;
}

/** Opens the print dialog for the acknowledgement only. Choose "Save as PDF" to download it. */
export function downloadAcknowledgement(data) {
  const html = buildAcknowledgementHtml(data);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);

  const cleanup = () => setTimeout(() => frame.remove(), 500);
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return cleanup();
    win.onafterprint = cleanup;
    win.focus();
    win.print();
    setTimeout(() => frame.isConnected && frame.remove(), 60000); // safety net
  };
  frame.srcdoc = html;
}
