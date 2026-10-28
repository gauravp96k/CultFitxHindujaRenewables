import { useEffect, useState } from 'react';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import { hrService } from '../../services/api';
import { DOMAIN, PERMISSIONS, asList, errText, fmtDateTime, isSuperAdmin } from '../../lib/wellness';
import {
  Banner,
  ConfirmDialog,
  Field,
  IconButton,
  Modal,
  Note,
  PageHeader,
  Spinner,
  btn,
  input,
  labelCls,
  useToast,
} from '../../components/ui';
import DataTable from '../../components/DataTable';

/* ── Presets / helpers ───────────────────────────────────────────────── */

const permsWith = (...keys) => Object.fromEntries(PERMISSIONS.map((p) => [p.key, keys.includes(p.key)]));
const PRESETS = [
  { key: 'full', label: 'Sub-admin', perms: permsWith('viewOptIns', 'approveOptIns', 'reports', 'serviceTracking') },
  { key: 'view', label: 'Sub-admin (view only)', perms: permsWith('viewOptIns') },
];
const presetOf = (perms = {}) =>
  PRESETS.find((p) => PERMISSIONS.every((m) => Boolean(perms[m.key]) === p.perms[m.key]))?.key || 'custom';
const cleanPerms = (perms = {}) => Object.fromEntries(PERMISSIONS.map((p) => [p.key, Boolean(perms[p.key])]));
const hasModule = (perms = {}) => PERMISSIONS.some((p) => perms[p.key]);
const isViewOnly = (u) => !isSuperAdmin(u?.role) && presetOf(u?.permissions) === 'view';
const nameOf = (u) => u?.fullName || u?.email || 'this user';

const EMAIL_RX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const EMP_ID_RX = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const checkboxStyle = { accentColor: 'var(--action)', width: 16, height: 16 };
const errStyle = (msg) => (msg ? { borderColor: 'var(--danger)' } : undefined);
const pillCls = 'inline-flex items-center whitespace-nowrap rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold leading-[17.05px]';

function roleStyle(role) {
  if (isSuperAdmin(role)) return { color: 'var(--danger-text)', background: 'var(--danger-soft)' };
  if (/sub/i.test(String(role || ''))) return { color: 'var(--brand)', background: 'var(--navy-tint)' };
  return { color: 'var(--grey)', background: 'var(--surface-3)' };
}

const RolePill = ({ u }) => (
  <span className={pillCls} style={roleStyle(u.role)}>
    {isSuperAdmin(u.role) ? 'Super Admin' : isViewOnly(u) ? 'Sub-admin (view)' : u.role || 'Employee'}
  </span>
);

const StatusPill = ({ active }) => (
  <span
    className={`${pillCls} gap-1.5`}
    style={active ? { color: 'var(--success-text)', background: 'var(--success-soft)' } : { color: 'var(--grey)', background: 'var(--surface-3)' }}
  >
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
    {active ? 'Active' : 'Disabled'}
  </span>
);

const Granted = ({ on }) =>
  on ? (
    <CheckOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--success-text)' }} titleAccess="Granted" />
  ) : (
    <CloseOutlined sx={{ fontSize: 16 }} style={{ color: 'var(--muted-2)' }} titleAccess="Not granted" />
  );

/** Role preset select + module checkboxes (shared by the add and edit modals). */
function AccessFields({ perms, onChange, error }) {
  const preset = presetOf(perms);
  return (
    <div className="space-y-[14px]">
      <Field label="Role">
        <select
          className={input}
          aria-label="Role preset"
          value={preset}
          onChange={(e) => {
            const p = PRESETS.find((x) => x.key === e.target.value);
            if (p) onChange({ ...p.perms });
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          {preset === 'custom' && (
            <option value="custom" disabled>
              Custom modules
            </option>
          )}
        </select>
      </Field>
      <Field label="Module permissions" error={error}>
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={Boolean(perms[p.key])}
                onChange={(e) => onChange({ ...perms, [p.key]: e.target.checked })}
              />
              {p.label}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function HrAccess({ user, crumbs }) {
  const toast = useToast();
  const meId = String(user?._id || user?.id || '');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');
  const [tick, setTick] = useState(0);

  // Edit access modal
  const [edit, setEdit] = useState(null); // { user, permissions }
  const [editErr, setEditErr] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  // Disable / remove confirmations
  const [confirm, setConfirm] = useState(null); // { kind: 'disable' | 'remove', user }
  const [confirmErr, setConfirmErr] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Add sub-admin modal
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [selected, setSelected] = useState(null);
  const [manual, setManual] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', employeeId: '' });
  const [addPerms, setAddPerms] = useState({ ...PRESETS[0].perms });
  const [addErr, setAddErr] = useState({});
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    hrService
      .getUsersAccess()
      .then((res) => {
        if (!alive) return;
        setUsers(asList(res?.data, 'users', 'admins'));
        setPageErr('');
      })
      .catch((err) => alive && setPageErr(errText(err, 'Could not load the user access list')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  // Debounced employee search (setState only inside the timeout / promise callbacks).
  useEffect(() => {
    const term = q.trim();
    if (!addOpen || selected || manual || term.length < 2) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      setSearching(true);
      hrService
        .searchUsers(term)
        .then((res) => {
          if (!alive) return;
          setResults(asList(res?.data, 'users').slice(0, 10));
          setSearched(true);
        })
        .catch((err) => alive && setSearchErr(errText(err, 'Search failed')))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, addOpen, selected, manual]);

  /* ── Row actions ── */
  const openEdit = (u) => {
    setEditErr('');
    setEdit({ user: u, permissions: cleanPerms(u.permissions) });
  };

  const saveEdit = async () => {
    if (!hasModule(edit.permissions)) {
      setEditErr('Give the sub-admin at least one module, or remove admin access.');
      return;
    }
    setEditBusy(true);
    try {
      await hrService.updateUserAccess(edit.user._id, { role: 'Sub-admin', permissions: edit.permissions });
      setEdit(null);
      toast('Saved');
      reload();
    } catch (err) {
      setEditErr(errText(err, 'Could not save access'));
    } finally {
      setEditBusy(false);
    }
  };

  const enable = async (u) => {
    try {
      await hrService.updateUserAccess(u._id, { isActive: true });
      setPageErr('');
      toast('Access enabled');
      reload();
    } catch (err) {
      setPageErr(errText(err, 'Could not enable access'));
    }
  };

  const askConfirm = (kind, u) => {
    setConfirmErr('');
    setConfirm({ kind, user: u });
  };
  const cancelConfirm = () => !confirmBusy && setConfirm(null);

  const runConfirm = async () => {
    const { kind, user: u } = confirm;
    setConfirmBusy(true);
    try {
      if (kind === 'disable') await hrService.updateUserAccess(u._id, { isActive: false });
      else await hrService.updateUserAccess(u._id, { role: 'Employee' });
      setConfirm(null);
      if (kind === 'remove') setEdit(null);
      toast(kind === 'disable' ? 'Access disabled' : 'Admin access removed');
      reload();
    } catch (err) {
      setConfirmErr(errText(err, 'Could not update access'));
    } finally {
      setConfirmBusy(false);
    }
  };

  /* ── Add sub-admin ── */
  const openAdd = () => {
    setQ('');
    setResults([]);
    setSearching(false);
    setSearched(false);
    setSearchErr('');
    setSelected(null);
    setManual(false);
    setNewUser({ fullName: '', email: '', employeeId: '' });
    setAddPerms({ ...PRESETS[0].perms });
    setAddErr({});
    setAddOpen(true);
  };
  const closeAdd = () => !addBusy && setAddOpen(false);

  const onSearchChange = (e) => {
    setQ(e.target.value);
    setResults([]);
    setSearched(false);
    setSearching(false);
    setSearchErr('');
  };

  const pick = (u) => {
    setSelected(u);
    setAddErr({});
    if (!isSuperAdmin(u.role) && /sub/i.test(String(u.role || '')) && hasModule(u.permissions)) setAddPerms(cleanPerms(u.permissions));
  };
  const changeSelection = () => {
    setSelected(null);
    setAddPerms({ ...PRESETS[0].perms });
  };

  const startManual = () => {
    const term = q.trim();
    setManual(true);
    setAddErr({});
    setNewUser({
      fullName: term && !term.includes('@') ? term : '',
      email: term.includes('@') ? term.toLowerCase() : '',
      employeeId: '',
    });
  };

  const selectedIsSuper = Boolean(selected && isSuperAdmin(selected.role));

  const saveAdd = async () => {
    const e = {};
    let who = null;
    if (selected) {
      who = { email: String(selected.email || '').toLowerCase(), fullName: selected.fullName || '' };
    } else if (manual) {
      const fullName = newUser.fullName.trim();
      const email = newUser.email.trim().toLowerCase();
      const employeeId = newUser.employeeId.trim().toUpperCase();
      if (!fullName) e.fullName = 'Enter the full name';
      if (!EMAIL_RX.test(email) || !email.endsWith(DOMAIN)) e.email = `Use an official ${DOMAIN} email`;
      if (employeeId && !EMP_ID_RX.test(employeeId)) e.employeeId = 'Use 2–20 letters, numbers or hyphens';
      who = { email, fullName, ...(employeeId ? { employeeId } : {}) };
    } else {
      e.form = 'Search and select an employee, or add someone not in the list.';
    }
    if (!hasModule(addPerms)) e.perms = 'Give the sub-admin at least one module';
    setAddErr(e);
    if (Object.keys(e).length || selectedIsSuper) return;

    setAddBusy(true);
    try {
      await hrService.createSubAdmin({ ...who, role: 'Sub-admin', permissions: addPerms });
      setAddOpen(false);
      toast('Sub-admin added');
      reload();
    } catch (err) {
      setAddErr({ form: errText(err, 'Could not add the sub-admin') });
    } finally {
      setAddBusy(false);
    }
  };

  /* ── Table ── */
  const columns = [
    {
      key: 'name',
      header: 'Name',
      width: '16%',
      wrap: true,
      sortValue: (u) => String(u.fullName || u.email || '').toLowerCase(),
      title: (u) => `${u.fullName || ''} ${u.email || ''}`.trim(),
      render: (u) => (
        <div className="min-w-0">
          <div className="break-words font-bold text-[var(--ink-2)]">{u.fullName || '—'}</div>
          <div className="break-all text-[11px] text-[var(--muted-2)]">{u.email}</div>
        </div>
      ),
    },
    { key: 'employeeId', header: 'Emp ID', width: '8%', sortValue: (u) => u.employeeId || '' },
    {
      key: 'role',
      header: 'Role',
      width: '11%',
      sortValue: (u) => (isSuperAdmin(u.role) ? 0 : isViewOnly(u) ? 2 : 1),
      title: (u) => u.role || '',
      render: (u) => <RolePill u={u} />,
    },
    ...PERMISSIONS.map((p) => ({
      key: `perm-${p.key}`,
      header: p.label,
      width: '7%',
      align: 'center',
      title: (u) => (isSuperAdmin(u.role) || u.permissions?.[p.key] ? 'Granted' : 'Not granted'),
      render: (u) => <Granted on={isSuperAdmin(u.role) || Boolean(u.permissions?.[p.key])} />,
    })),
    {
      key: 'userAccess',
      header: 'User access',
      width: '7%',
      align: 'center',
      title: (u) => (isSuperAdmin(u.role) ? 'Granted' : 'Not granted'),
      render: (u) => <Granted on={isSuperAdmin(u.role)} />,
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      width: '10%',
      sortValue: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : null),
      render: (u) => (u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'),
    },
    {
      key: 'status',
      header: 'Status',
      width: '8%',
      sortValue: (u) => (u.isActive === false ? 1 : 0),
      title: (u) => (u.isActive === false ? 'Disabled' : 'Active'),
      render: (u) => <StatusPill active={u.isActive !== false} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '5%',
      align: 'center',
      title: (u) => (String(u._id) === meId ? 'This is you' : isSuperAdmin(u.role) ? 'Super Admin has full access' : 'Actions'),
      render: (u) => {
        if (String(u._id) === meId || isSuperAdmin(u.role)) return <span className="text-[var(--muted-2)]">—</span>;
        const active = u.isActive !== false;
        return (
          <span className="inline-flex items-center gap-0.5">
            <IconButton icon={EditOutlined} label="Edit access" onClick={() => openEdit(u)} />
            {active ? (
              <IconButton icon={CancelOutlined} label="Disable" danger onClick={() => askConfirm('disable', u)} />
            ) : (
              <IconButton icon={CheckCircleOutlineOutlined} label="Enable" onClick={() => enable(u)} />
            )}
          </span>
        );
      },
    },
  ];

  const term = q.trim();

  return (
    <div className="space-y-4">
      <PageHeader crumbs={crumbs} title="User Access Management" />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${btn.primary}${btn.sm}`} onClick={openAdd}>
          <PersonAddOutlined sx={{ fontSize: 14 }} /> Add sub-admin
        </button>
      </div>

      <Banner onRetry={users.length ? undefined : reload}>{pageErr}</Banner>

      {loading ? (
        <Spinner label="Loading users…" />
      ) : (
        <DataTable columns={columns} rows={users} rowKey={(u) => u._id} minWidth={1200} empty="No admin users found." />
      )}

      <Note>
        Only the Super Admin can add, edit or disable sub-admins. Sub-admins only see the modules they are given. Every access change is recorded in the Audit
        Trail.
      </Note>

      {/* Edit access (hidden while its "Remove admin access" confirmation is open) */}
      <Modal
        open={!!edit && !confirm}
        onClose={() => !editBusy && setEdit(null)}
        title={`Edit access · ${nameOf(edit?.user)}`}
        size="md"
        icon={SecurityOutlined}
        footer={
          <>
            <button type="button" className={btn.primary} onClick={saveEdit} disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={btn.text} onClick={() => !editBusy && setEdit(null)}>
              Cancel
            </button>
          </>
        }
      >
        {edit && (
          <div className="space-y-[14px] py-2">
            <Banner>{editErr}</Banner>
            <p className="text-[12.5px] text-[var(--muted)]">
              {edit.user.email}
              {edit.user.employeeId ? ` · ${edit.user.employeeId}` : ''}
            </p>
            <AccessFields perms={edit.permissions} onChange={(permissions) => setEdit((x) => ({ ...x, permissions }))} />
            <div className="border-t border-[var(--line-soft)] pt-3">
              <button type="button" className={btn.link} style={{ color: 'var(--danger)' }} onClick={() => askConfirm('remove', edit.user)}>
                Remove admin access
              </button>
              <p className="mt-1 text-[11px] text-[var(--muted)]">They stay an employee but can no longer open the HR Console.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable / remove confirmation */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'remove' ? 'Remove admin access' : 'Disable access'}
        confirmLabel={confirm?.kind === 'remove' ? 'Remove access' : 'Disable'}
        danger
        busy={confirmBusy}
        onConfirm={runConfirm}
        onCancel={cancelConfirm}
      >
        <Banner>{confirmErr}</Banner>
        {confirm?.kind === 'remove'
          ? `Remove admin access for ${nameOf(confirm?.user)}? They become a regular employee and lose the HR Console. You can add them again later.`
          : `Disable access for ${nameOf(confirm?.user)}? They will be signed out and can't open the HR Console until re-enabled.`}
      </ConfirmDialog>

      {/* Add sub-admin */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Add sub-admin"
        size="md"
        icon={PersonAddOutlined}
        footer={
          <>
            <button type="button" className={btn.primary} onClick={saveAdd} disabled={addBusy || selectedIsSuper}>
              {addBusy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className={btn.text} onClick={closeAdd}>
              Cancel
            </button>
          </>
        }
      >
        <div className="space-y-[14px] py-2">
          <Banner>{addErr.form}</Banner>

          {selected ? (
            <div>
              <span className={labelCls}>Employee</span>
              <div className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--ink-2)]">{selected.fullName || selected.email}</p>
                  <p className="truncate text-[11px] text-[var(--muted-2)]">
                    {selected.email}
                    {selected.employeeId ? ` · ${selected.employeeId}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RolePill u={selected} />
                  <button type="button" className={btn.link} onClick={changeSelection}>
                    Change
                  </button>
                </div>
              </div>
              {selectedIsSuper && (
                <Banner type="warn">{nameOf(selected)} is already a Super Admin with full access and cannot be made a sub-admin here.</Banner>
              )}
              {!selectedIsSuper && /sub/i.test(String(selected.role || '')) && (
                <Banner type="warn">{nameOf(selected)} is already a sub-admin. Saving replaces their modules{selected.isActive === false ? ' and re-enables them' : ''}.</Banner>
              )}
            </div>
          ) : manual ? (
            <div>
              <div className="grid gap-x-[18px] gap-y-[14px] sm:grid-cols-2">
                <Field label="Full name" required error={addErr.fullName}>
                  <input
                    data-autofocus
                    className={input}
                    style={errStyle(addErr.fullName)}
                    aria-label="Full name"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser((n) => ({ ...n, fullName: e.target.value }))}
                  />
                </Field>
                <Field label="Official email" required error={addErr.email}>
                  <input
                    type="email"
                    className={input}
                    style={errStyle(addErr.email)}
                    aria-label="Official email"
                    placeholder={`name${DOMAIN}`}
                    value={newUser.email}
                    onChange={(e) => setNewUser((n) => ({ ...n, email: e.target.value }))}
                  />
                </Field>
                <Field label="Emp ID" error={addErr.employeeId} hint="Optional">
                  <input
                    className={input}
                    style={errStyle(addErr.employeeId)}
                    aria-label="Employee ID"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser((n) => ({ ...n, employeeId: e.target.value }))}
                  />
                </Field>
              </div>
              <button type="button" className={`${btn.link} mt-2`} onClick={() => setManual(false)}>
                Back to search
              </button>
            </div>
          ) : (
            <Field label="Employee (search by name / emp ID / email)" required hint={term.length < 2 ? 'Type at least 2 characters' : undefined}>
              <div className="relative">
                <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-2)' }} />
                <input data-autofocus className={`${input} pl-9`} aria-label="Search employees" placeholder="Name / Emp ID / email" value={q} onChange={onSearchChange} />
              </div>
              <Banner>{searchErr}</Banner>
              {term.length >= 2 && !searchErr && (searching || !searched) && <p className="mt-2 text-[12px] text-[var(--muted)]">Searching…</p>}
              {searched && results.length > 0 && (
                <ul className="mt-2 max-h-[260px] overflow-y-auto rounded-[10px] border border-[var(--line)]" aria-label="Search results">
                  {results.map((u) => (
                    <li key={u._id} className="border-b border-[var(--line-soft)] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => pick(u)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-[120ms] hover:bg-[var(--hover-tint)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--action)]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold text-[var(--ink-2)]">{u.fullName || u.email}</span>
                          <span className="block truncate text-[11px] text-[var(--muted-2)]">
                            {u.email}
                            {u.employeeId ? ` · ${u.employeeId}` : ''}
                          </span>
                        </span>
                        <RolePill u={u} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searched && !results.length && !searchErr && <p className="mt-2 text-[12px] text-[var(--muted)]">No employee matches “{term}”.</p>}
              <button type="button" className={`${btn.link} mt-2`} onClick={startManual}>
                Add someone not in the list
              </button>
            </Field>
          )}

          <AccessFields
            perms={addPerms}
            onChange={(p) => {
              setAddPerms(p);
              setAddErr((x) => ({ ...x, perms: undefined }));
            }}
            error={addErr.perms}
          />
        </div>
      </Modal>
    </div>
  );
}
