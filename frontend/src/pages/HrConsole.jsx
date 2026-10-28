import { useEffect, useMemo, useState } from 'react';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { can, isSuperAdmin, userName } from '../lib/wellness';
import { ToastProvider } from '../components/ui';
import BrandLogos from '../components/layout/BrandLogos';
import HrDashboard from './hr/HrDashboard';
import HrOptIns from './hr/HrOptIns';
import HrReports from './hr/HrReports';
import HrService from './hr/HrService';
import HrPackages from './hr/HrPackages';
import HrGyms from './hr/HrGyms';
import HrPolicy from './hr/HrPolicy';
import HrAccess from './hr/HrAccess';
import HrAudit from './hr/HrAudit';

/*
 * HR Console — layout from the wireframe (sidebar + module pages), styled with the
 * ACH build spec. Each sidebar entry is shown only if the user has that module;
 * the backend enforces the same permissions on every API call.
 */
const MODULES = [
  { key: 'dash', label: 'Dashboard', icon: DashboardOutlined, perms: ['viewOptIns', 'reports', 'serviceTracking'], Page: HrDashboard },
  { key: 'optins', label: 'Employee Opt-ins', icon: GroupOutlined, perms: ['viewOptIns'], Page: HrOptIns },
  { key: 'reports', label: 'Consolidated Report', icon: DescriptionOutlined, perms: ['reports'], Page: HrReports },
  { key: 'service', label: 'Service Tracking', icon: ScheduleOutlined, perms: ['serviceTracking'], Page: HrService },
  { key: 'packages', label: 'Packages & Pricing', icon: Inventory2Outlined, perms: ['packagesGyms'], Page: HrPackages },
  { key: 'gyms', label: 'Gym Master', icon: PlaceOutlined, perms: ['packagesGyms'], Page: HrGyms },
  { key: 'policy', label: 'Policy', icon: AssignmentOutlined, perms: null, Page: HrPolicy }, // every admin (read-only)
  { key: 'access', label: 'User Access', icon: VerifiedUserOutlined, superOnly: true, Page: HrAccess },
  { key: 'audit', label: 'Audit Trail', icon: HistoryOutlined, perms: ['reports'], Page: HrAudit },
];

const allowed = (m, user) => (m.superOnly ? isSuperAdmin(user?.role) : !m.perms || can(user, ...m.perms));

const topBtn =
  'inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-bold text-white transition-colors duration-[120ms] hover:bg-white/[.14] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white';

export default function HrConsole({ onExit }) {
  const { token, user, login, logout } = useAuth();
  const modules = useMemo(() => MODULES.filter((m) => allowed(m, user)), [user]);
  const [active, setActive] = useState({ key: null, opts: {}, n: 0 });

  // Refresh the user from the server so permission changes made by the Super Admin apply now.
  useEffect(() => {
    let alive = true;
    authService
      .me()
      .then((res) => alive && res?.data?.user && login(token, res.data.user))
      .catch((err) => alive && err?.response?.status === 401 && logout());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = modules.find((m) => m.key === active.key) || modules[0];
  const go = (key, opts = {}) => {
    setActive((a) => ({ key, opts, n: a.n + 1 }));
    document.getElementById('hr-main')?.scrollTo({ top: 0 });
  };

  const roleChip = isSuperAdmin(user?.role)
    ? { color: 'var(--danger-text)', background: 'var(--danger-soft)' }
    : { color: 'var(--brand)', background: 'var(--navy-tint)' };

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
        {/* Top bar — spec 6.1 (40px, --topbar) */}
        <header className="flex h-10 shrink-0 items-center gap-3 px-4 text-white" style={{ background: 'var(--topbar)' }}>
          <BrandLogos />
          <span className="text-[12px] font-bold text-white/90">HR Console</span>
          <div className="ml-auto flex items-center gap-1">
            {onExit && (
              <button type="button" onClick={onExit} className={topBtn}>
                <HomeOutlined sx={{ fontSize: 18 }} /> Employee portal
              </button>
            )}
            <span className="hidden items-center gap-1.5 px-2 text-[12px] font-bold sm:inline-flex">
              <PersonOutlined sx={{ fontSize: 18 }} />
              <span className="max-w-40 truncate">{userName(user)}</span>
            </span>
            <button type="button" onClick={logout} className={topBtn}>
              Log out
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="shrink-0 border-b border-[var(--line)] bg-[var(--surface)] lg:w-[236px] lg:border-b-0 lg:border-r">
            <div className="hidden px-4 pb-3 pt-4 lg:block">
              <p className="text-[16px] font-bold leading-[24.8px] text-[var(--ink)]">HR Console</p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">Logged in: {userName(user)}</p>
              {user?.role && (
                <span className="mt-1.5 inline-flex rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold" style={roleChip}>
                  {user.role}
                </span>
              )}
            </div>
            <nav aria-label="HR modules" className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:overflow-visible lg:border-t lg:border-[var(--line-soft)]">
              {modules.map((m) => {
                const on = m.key === current?.key;
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => go(m.key)}
                    aria-current={on ? 'page' : undefined}
                    className={`relative flex h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[8px] px-3 text-left text-[13.5px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action)] ${
                      on
                        ? 'bg-[var(--navy-tint)] font-bold text-[var(--brand)]'
                        : 'font-medium text-[var(--grey)] hover:bg-[var(--hover-tint)] hover:text-[var(--action)]'
                    }`}
                  >
                    {on && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 hidden w-[3px] rounded-r-[3px] bg-[var(--brand)] lg:block" />}
                    <Icon sx={{ fontSize: 16 }} />
                    {m.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Module page — the page itself scrolls inside main, never the body (spec 1) */}
          <main id="hr-main" className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {current ? (
              <current.Page
                key={`${current.key}-${active.n}`}
                user={user}
                go={go}
                opts={current.key === active.key ? active.opts : {}}
                crumbs={[{ label: 'HR Console', onClick: () => go(modules[0].key) }, { label: current.label }]}
              />
            ) : (
              <div className="mx-auto mt-16 max-w-md rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]">
                <p className="text-[16px] font-bold text-[var(--ink)]">No modules assigned</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">Ask the Super Admin to give you access to at least one HR module.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
