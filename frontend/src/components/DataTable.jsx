import { useMemo, useState } from 'react';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';

/*
 * Register table per the ACH build spec, section 6.7:
 * fixed layout, nowrap + ellipsis cells (full text in title), zebra rows, no row hover,
 * 13 rows per page, sortable headers (swap_vert / arrow_upward / arrow_downward),
 * list footer "Showing 1–13 of n" with Previous / Next.
 *
 *   <DataTable
 *     columns={[{ key, header, width: '12%', align: 'center', render: (row) => node,
 *                 sortValue: (row) => value, title: (row) => text, wrap: true }]}
 *     rows={rows}
 *     rowKey={(r) => r._id}
 *     selectable selected={ids} onSelectedChange={setIds}
 *     empty="No records"
 *   />
 */

const PAGE_SIZE = 13;

const headerCls =
  'bg-[var(--surface-2)] px-[18px] py-[10px] text-left text-[11px] font-bold capitalize leading-[17.05px] tracking-[0.33px] text-[var(--muted)]';
const cellCls = 'overflow-hidden text-ellipsis whitespace-nowrap px-[18px] py-[7px] text-[12.5px] leading-[19.38px] text-[var(--muted)] tabular-nums';
const pageBtn =
  'inline-flex h-[30px] items-center rounded-[4px] px-3 text-[12px] font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';

export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r._id,
  pageSize = PAGE_SIZE,
  selectable = false,
  selected = [],
  onSelectedChange,
  empty = 'No records found.',
  minWidth = 900,
  resetKey,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  // The page resets to 1 whenever the data set or filters change (pageFor !== current key).
  const listKey = `${resetKey ?? ''}|${rows.length}`;
  const [pageState, setPageState] = useState({ key: listKey, page: 1 });
  const page = pageState.key === listKey ? pageState.page : 1;
  const setPage = (p) => setPageState({ key: listKey, page: p });

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col || !col.sortValue) return rows;
    const val = col.sortValue;
    const out = [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === y) return 0;
      if (x === null || x === undefined || x === '') return 1;
      if (y === null || y === undefined || y === '') return -1;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true });
    });
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (key) =>
    setSort((s) => (s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }));

  const ids = visible.map(rowKey);
  const allOnPage = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someOnPage = !allOnPage && ids.some((id) => selected.includes(id));
  const togglePage = () =>
    onSelectedChange?.(allOnPage ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  const toggleRow = (id) => onSelectedChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse" style={{ minWidth }}>
          <colgroup>
            {selectable && <col style={{ width: 44 }} />}
            {columns.map((c) => (
              <col key={c.key} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {selectable && (
                <th className={`${headerCls} !px-[14px]`}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPage}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPage;
                    }}
                    onChange={togglePage}
                    style={{ accentColor: 'var(--action)', width: 16, height: 16 }}
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort.key === c.key;
                const align = c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left';
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`${headerCls} ${align}`}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex max-w-full items-center gap-1 capitalize hover:text-[var(--ink-2)] ${c.align === 'center' ? 'justify-center' : ''}`}
                      >
                        <span className="truncate">{c.header}</span>
                        {active && sort.dir === 'asc' && <ArrowUpwardOutlined sx={{ fontSize: 15 }} style={{ color: 'var(--brand)' }} />}
                        {active && sort.dir === 'desc' && <ArrowDownwardOutlined sx={{ fontSize: 15 }} style={{ color: 'var(--brand)' }} />}
                        {!active && <SwapVertOutlined sx={{ fontSize: 15 }} style={{ color: 'var(--muted)' }} />}
                      </button>
                    ) : (
                      <span className="block truncate">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const id = rowKey(r);
              const isSel = selected.includes(id);
              return (
                <tr key={id} style={{ background: isSel ? 'var(--selected-tint)' : i % 2 ? 'var(--surface-2)' : undefined }}>
                  {selectable && (
                    <td className={`${cellCls} !px-[14px]`}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={isSel}
                        onChange={() => toggleRow(id)}
                        style={{ accentColor: 'var(--action)', width: 16, height: 16 }}
                      />
                    </td>
                  )}
                  {columns.map((c) => {
                    const content = c.render ? c.render(r) : r[c.key];
                    const plain = c.title ? c.title(r) : typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
                    const align = c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : '';
                    return (
                      <td key={c.key} className={`${cellCls} ${align} ${c.wrap ? '!whitespace-normal' : ''}`} title={plain}>
                        {content === undefined || content === null || content === '' ? '—' : content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td className={`${cellCls} py-8 text-center text-[var(--muted-2)]`} colSpan={columns.length + (selectable ? 1 : 0)}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* List footer (spec 6.7) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-[18px] py-[5px] text-[12.5px] text-[var(--muted)]">
        <span>
          {sorted.length ? `Showing ${start + 1}–${start + visible.length} of ${sorted.length}` : 'Showing 0 of 0'}
          {selectable && selected.length > 0 && <span className="ml-2 font-bold text-[var(--brand)]">· {selected.length} selected</span>}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            className={`${pageBtn} ${current > 1 ? 'bg-[var(--action)] text-white hover:bg-[var(--action-hover)]' : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]'}`}
          >
            Previous
          </button>
          <span className="px-2 tabular-nums">
            {current} / {pages}
          </span>
          <button
            type="button"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
            className={`${pageBtn} border border-transparent text-[var(--action)] hover:border-[var(--text-btn-hover-border)] hover:bg-[var(--text-btn-hover-bg)] hover:text-[var(--action-hover)]`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
