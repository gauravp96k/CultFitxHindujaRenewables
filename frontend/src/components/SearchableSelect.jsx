import { useEffect, useMemo, useRef, useState } from 'react';
import Popover from '@mui/material/Popover';
import InputBase from '@mui/material/InputBase';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';

/*
 * Searchable dropdown (MUI Popover + search box + menu list), styled with the ACH tokens.
 *
 *   <SearchableSelect
 *     id="preferred-centre"
 *     value={value}                     // '' means the "all" option
 *     onChange={(v) => ...}
 *     options={[{ value, label, secondary }]}
 *     allLabel="No preference"          // first option, value ''
 *     searchPlaceholder="Search centres"
 *     emptyText="No centres match."
 *   />
 */

const optionSx = {
  minHeight: 'auto',
  gap: '10px',
  borderRadius: '7px',
  padding: '9px 12px',
  font: '600 13px/20.15px var(--font)',
  color: 'var(--ink-2)',
  whiteSpace: 'normal',
  transition: 'background-color .12s',
  '&:hover, &.Mui-focusVisible': { backgroundColor: 'var(--hover-tint)' },
  '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': { backgroundColor: 'var(--hover-tint)' },
};

export default function SearchableSelect({
  id,
  value = '',
  onChange,
  options = [],
  allLabel = 'All',
  placeholder,
  searchPlaceholder = 'Search',
  emptyText = 'No matches.',
  disabled = false,
  invalid = false,
}) {
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null); // the trigger button while the menu is open
  const [query, setQuery] = useState('');
  const open = Boolean(anchorEl);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : value || placeholder || allLabel || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.secondary || ''}`.toLowerCase().includes(q));
  }, [options, query]);

  // Put the cursor in the search box as soon as the menu opens.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const close = () => {
    setAnchorEl(null);
    setQuery('');
  };
  const pick = (v) => {
    onChange?.(v);
    close();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      listRef.current?.querySelector('[role="menuitem"]')?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length) pick(filtered[0].value);
    }
  };

  const borderColor = invalid ? 'var(--danger)' : open ? 'var(--input-hover-border)' : 'var(--line)';

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className="flex h-[38px] w-full items-center gap-2 rounded-[10px] border bg-[var(--surface)] px-3 text-left text-[13px] text-[var(--ink-2)] outline-none transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:border-[var(--brand)] focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)]"
        style={{ borderColor }}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-[var(--ink)]' : ''}`}>{label}</span>
        <ExpandMoreOutlined
          sx={{ fontSize: 16, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}
          style={{ color: open ? 'var(--brand)' : 'var(--muted-2)' }}
        />
      </button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        disableAutoFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: '6px',
              width: Math.max(anchorEl?.offsetWidth || 0, 280),
              padding: '6px',
              borderRadius: '10px',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-overlay)',
              backgroundColor: 'var(--surface)',
            },
          },
        }}
      >
        {/* Search box */}
        <div className="flex h-9 items-center gap-2 rounded-[8px] border border-[var(--line)] px-2.5 transition-colors duration-[120ms] focus-within:border-[var(--input-hover-border)]">
          <SearchOutlined sx={{ fontSize: 15 }} style={{ color: 'var(--muted-2)' }} />
          <InputBase
            inputRef={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            fullWidth
            inputProps={{ 'aria-label': searchPlaceholder }}
            sx={{
              font: '400 13px/20.15px var(--font)',
              color: 'var(--ink)',
              '& input::placeholder': { color: 'var(--muted-2)', opacity: 1 },
            }}
          />
        </div>

        <MenuList ref={listRef} dense disablePadding sx={{ mt: '6px', outline: 'none' }}>
          {/* "All" option — pass allLabel={null} to hide it (field is mandatory) */}
          {allLabel !== null && (
            <MenuItem disableRipple selected={!value} onClick={() => pick('')} sx={optionSx}>
              <PlaceOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--muted)' }} />
              <span className={`flex-1 ${!value ? 'font-bold text-[var(--ink)]' : ''}`}>{allLabel}</span>
              {!value && <CheckOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--action)' }} />}
            </MenuItem>
          )}
          {allLabel !== null && <Divider sx={{ my: '6px !important', borderColor: 'var(--line-soft)' }} />}

          {filtered.length ? (
            <div className="max-h-[280px] overflow-y-auto">
              {filtered.map((o) => {
                const isSel = o.value === value;
                return (
                  <MenuItem key={o.value} disableRipple selected={isSel} onClick={() => pick(o.value)} sx={optionSx}>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${isSel ? 'font-bold text-[var(--ink)]' : ''}`}>{o.label}</span>
                      {o.secondary && (
                        <span className="block truncate text-[11px] font-medium text-[var(--muted)]">{o.secondary}</span>
                      )}
                    </span>
                    {isSel && <CheckOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--action)' }} />}
                  </MenuItem>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-[12.5px] text-[var(--muted)]">{emptyText}</p>
          )}
        </MenuList>
      </Popover>
    </>
  );
}
