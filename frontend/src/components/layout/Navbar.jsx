import React, { useEffect, useRef, useState } from 'react';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { useAuth } from '../../context/AuthContext';
import BrandLogos from './BrandLogos';
import { isAdminRole, userName } from '../../lib/wellness';

// Compare is reached by selecting packages on Home; My Requests is in the account menu.
const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'gyms', label: 'Gym Locator' },
  { key: 'policy', label: 'Policy / FAQs' },
];

export default function Navbar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isAdmin = isAdminRole(user?.role);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const go = (view) => {
    setMenuOpen(false);
    setCurrentView(view);
  };

  return (
    <header className="no-print sticky top-0 z-40">
      {/* Top bar — spec 6.1, --topbar background */}
      <div className="flex h-10 items-center gap-4 px-4 text-white" style={{ background: 'var(--topbar)' }}>
        <button
          type="button"
          onClick={() => go('home')}
          aria-label="Go to Home"
          className="flex items-center rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BrandLogos />
        </button>
        <div className="ml-auto flex items-center gap-2" ref={menuRef}>
          {isAdmin && (
            <button
              type="button"
              onClick={() => go('hr')}
              className="inline-flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12px] font-bold text-white transition-colors duration-[120ms] hover:bg-white/[.14]"
            >
              <VerifiedUserOutlined sx={{ fontSize: 18 }} /> HR Console
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-8 items-center gap-1 rounded-[8px] px-2 text-[12px] font-bold text-white transition-colors duration-[120ms] hover:bg-white/[.14]"
            >
              <PersonOutlined sx={{ fontSize: 18 }} />
              <span className="max-w-40 truncate">{userName(user)}</span>
              <ExpandMoreOutlined sx={{ fontSize: 14 }} className="text-white/70" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-56 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-overlay)]"
              >
                <div className="border-b border-[var(--line-soft)] px-3 py-2 text-[11px]">
                  <div className="truncate text-[13px] font-bold text-[var(--ink)]">{userName(user)}</div>
                  <div className="truncate text-[var(--muted)]">{user?.email}</div>
                  {user?.role && <div className="mt-0.5 font-bold text-[var(--brand)]">{user.role}</div>}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go('my')}
                  className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-[13px] font-semibold text-[var(--ink-2)] hover:bg-[var(--hover-tint)]"
                >
                  <AssignmentOutlined sx={{ fontSize: 15 }} className="text-[var(--action)]" /> My Requests
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-left text-[13px] font-semibold text-[var(--ink-2)] hover:bg-[var(--hover-tint)]"
                >
                  <LogoutOutlined sx={{ fontSize: 15 }} className="text-[var(--danger)]" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab row — spec 6.1 tabs */}
      <nav className="flex gap-1 border-b border-[var(--line)] bg-[var(--surface)] px-5">
        {TABS.map((t) => {
          const active = currentView === t.key || (t.key === 'home' && ['form', 'compare', 'my'].includes(currentView));
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => go(t.key)}
              aria-current={active ? 'page' : undefined}
              className={`relative whitespace-nowrap px-3 pb-2 pt-[7px] text-[14px] leading-[21.7px] transition-colors duration-[120ms] ${
                active
                  ? 'font-bold text-[var(--action-hover)]'
                  : 'font-medium text-[var(--grey)] hover:text-[var(--action)]'
              }`}
            >
              {t.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[6px]"
                  style={{ background: 'var(--action-hover)' }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
