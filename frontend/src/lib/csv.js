// Tiny CSV helpers (no extra npm packages needed). Excel opens and saves .csv files.

// Stop spreadsheet formula injection in exported data
const safe = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const cell = (v) => {
  const s = safe(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename, columns, rows) {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','));
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parses CSV text into objects keyed by a normalised header (lowercase, letters/digits only). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const clean = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!clean.length) return [];
  const headers = clean[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  return clean.slice(1).map((r, idx) => {
    const o = { __row: idx + 2 };
    headers.forEach((h, i) => { o[h] = String(r[i] ?? '').trim(); });
    return o;
  });
}

export const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.readAsText(file);
  });
