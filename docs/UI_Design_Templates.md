# UI/UX Component Templates

> Practical, copy-paste component patterns derived from `ACH_UI_UX_Build_Spec (1).md`
> (section 6) and matched to how they're actually built in this codebase
> (`frontend/src/components/ui.jsx`, React 19 + Tailwind 4 + `@mui/icons-material`).
>
> Colours reference the tokens documented in `Color_Palette.md`. The spec is the exact
> source of truth; this doc is the working template.

## Conventions

- **Icons:** Material Outlined only, imported individually.
  `import SearchOutlined from '@mui/icons-material/SearchOutlined';` → `<SearchOutlined sx={{ fontSize: 16 }} />`. Sizes: buttons 14, row actions 16, search 15, top bar 18. Colour = `currentColor`. No emoji, no `+`/`x`/`✔` text glyphs.
- **Font:** `var(--font)` (system stack). Weights 400/500/600/700 only.
- **Labels:** `capitalize`, never uppercase.
- **Transitions:** colour/background `.12s` (`transition-colors duration-[120ms]`).
- **Reuse first:** import `btn`, `card`, `input`, `Field`, `Modal`, `Banner`, `StatusBadge`, `TierBadge`, `GstPill`, `Chip`, `KpiCard`, `Spinner`, `FileButton` from `components/ui`. Only hand-roll when a page can't import them.

---

## 1. Buttons (spec 6.2)

All buttons: `inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50`. Height 36px (small 30px), radius 4.

```jsx
import { btn } from '../components/ui';

<button className={btn.primary}>Save</button>           {/* blue, white text */}
<button className={btn.secondary}>Cancel</button>       {/* white, line border */}
<button className={btn.danger}>Delete</button>          {/* red, stays red on hover */}
<button className={btn.smallGhost}>Edit</button>        {/* 30px ghost */}
<button className={btn.text}>Back</button>              {/* text button, hover fill */}
<button className={btn.link}>Reset</button>             {/* underlined brand link */}
```

Hand-rolled primary (when you can't import):
```jsx
<button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[var(--action)] px-4 text-[13px] font-bold text-white transition-colors duration-[120ms] hover:bg-[var(--action-hover)] disabled:cursor-not-allowed disabled:opacity-50">
  <SaveOutlined sx={{ fontSize: 14 }} /> Save
</button>
```

**Footer order:** primary first, then text/secondary. **Confirm dialogs:** destructive red button first, Cancel last (text button).

---

## 2. Inputs & fields (spec 6.4)

Standard input: 38px tall, radius 10, `--line` border; hover → `--input-hover-border`; focus → `--brand` border + `--focus-ring`.

```jsx
import { Field, input } from '../components/ui';

<Field label="Work Location" required error={errors.location} hint="Pick your base office">
  <input className={input} value={value} onChange={onChange} placeholder="Select…" />
</Field>
```

- Required marker: red `*` (`--danger`) after the label.
- Error state: `style={{ borderColor: 'var(--danger)' }}`; message `text-[11.5px] font-semibold text-[var(--danger)]`.
- Disabled / auto-filled: `disabled` → fills `--surface-2`, text `--muted`.
- Field label: `text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--muted)]`.

---

## 3. Select / dropdown

```jsx
<select className="h-[38px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] outline-none transition-colors duration-[120ms] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)]">
  <option>Mumbai</option>
</select>
```

Search box with leading icon:
```jsx
<div className="relative">
  <SearchOutlined sx={{ fontSize: 15 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
  <input className={`${input} pl-9`} placeholder="Search…" />
</div>
```

---

## 4. Cards & blocks (spec 6.11)

```jsx
import { card } from '../components/ui';
<section className={card}>…</section>
```
Card = `rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]`.

**KPI / summary card:**
```jsx
import { KpiCard } from '../components/ui';
<KpiCard label="Active Members" value={42} hint="this cycle" />
```

**Warning note:**
```jsx
<div className="rounded-[8px] border border-[var(--warn-border)] bg-[var(--warn-soft)] px-3 py-2.5 text-[12.5px] text-[var(--warn-text)]">
  Please review before submitting.
</div>
```

---

## 5. Badges, chips, pills (spec 6.5)

```jsx
import { StatusBadge, TierBadge, GstPill, Chip } from '../components/ui';

<StatusBadge status="Active" />          {/* soft fill + matching text token + leading dot */}
<TierBadge tier="ELITE" />               {/* categorical colour from level tokens */}
<GstPill />                              {/* "Inclusive of GST" success pill */}
<Chip active={on} onClick={toggle}>6 months</Chip>   {/* filter pill */}
```

Pill base: `rounded-[999px] px-[9px] py-[3px] text-[11px] font-bold`. Active chip =
`bg-[var(--brand)] text-white`; idle = `bg-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--navy-tint)] hover:text-[var(--brand)]`.

---

## 6. Table (spec 6.7)

Fixed layout, ellipsis cells, zebra rows, no row hover (lists), ~13 rows/page.

```jsx
import { th, td } from '../components/ui';

<div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
  <table className="w-full border-collapse text-left">
    <thead>
      <tr>{['Ref ID','Employee','Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={r.id} style={i % 2 ? { background: 'var(--surface-2)' } : undefined}>
          <td className={`${td} font-bold text-[var(--ink)]`}>{r.ref}</td>
          <td className={td}>{r.name}</td>
          <td className={td}><StatusBadge status={r.status} /></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

- Header cell: `--surface-2` bg, 11px/700 capitalize, `--muted`.
- Body cell: 12.5px, `--muted`; emphasis cells → `--ink`.
- Row actions: three 26×26 icon buttons (edit/view `--action` on `--hover-tint`; delete `--danger` on `--danger-soft`).

---

## 7. Modal / dialog (spec 4.5, 6.12)

```jsx
import { Modal, btn } from '../components/ui';

<Modal
  open={open}
  onClose={close}
  title="Edit Package"
  size="md"                         // sm 460 · md 640 · lg 880 · xl 960
  footer={<>
    <button className={btn.primary} onClick={save}>Save</button>
    <button className={btn.text} onClick={close}>Cancel</button>
  </>}
>
  <p>Body content…</p>
</Modal>
```

Built in: scrim (`--scrim`), `role="dialog"`, `aria-modal`, Escape + scrim-click close,
focus moves in. Header 12px/700, body scrolls (max 70vh), footer on `--surface-2`.

---

## 8. Form layout

```jsx
<form className={card} onSubmit={submit} noValidate>
  <h3 className="mb-3 text-[13.5px] font-bold text-[var(--ink)]">A. Employee details</h3>
  <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Full Name" required error={errors.name}>
      <input className={input} value={name} onChange={…} />
    </Field>
    {/* … */}
  </div>

  <div className="mt-5 flex flex-wrap gap-2">
    <button type="button" className={btn.secondary} onClick={back}>Back</button>
    <button type="submit" className={btn.primary} disabled={busy}>Submit request</button>
  </div>
</form>
```

Form grid gap `14px 18px`; label-to-input gap `6px`; section headings 13.5px/700.

---

## 9. Wizard stepper (spec 6.8)

Numbered circles joined by a connector that turns `--action` once a step is done.

```jsx
<ol className="my-4 flex flex-wrap items-center gap-1 text-[11px]">
  {STEPS.map((s, i) => {
    const done = i <= current;
    return (
      <li key={s} className="flex flex-1 items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: done ? 'var(--action)' : 'var(--step-pending)' }}>
          {i < current ? <CheckOutlined sx={{ fontSize: 14 }} /> : i + 1}
        </span>
        <span className={done ? 'font-bold text-[var(--ink)]' : 'text-[var(--muted)]'}>{s}</span>
        {i < STEPS.length - 1 && (
          <span className="h-[2px] min-w-4 flex-1" style={{ background: i < current ? 'var(--action)' : 'var(--step-line)' }} />
        )}
      </li>
    );
  })}
</ol>
```

---

## 10. Banners, toasts, feedback (spec 7)

```jsx
import { Banner } from '../components/ui';
<Banner type="error" onRetry={retry}>{errorMessage}</Banner>   {/* error | success | warn */}
```

Toast: bottom-centre or top-right, `--tooltip` bg, white 12.5px, radius 8, fades ~2.6s.
Inline alert = soft fill + matching text token + leading Outlined icon.

---

## 11. Page frame & navigation (spec 1, 6.1)

- **Top bar:** `h-10`, `bg: var(--topbar)`, white 12px/700 content, icon buttons 18px.
- **Tabs:** idle `text-[var(--grey)] font-medium`; active `text-[var(--action-hover)] font-bold` with a 3px sliding underline in `--action-hover`.
- **Page padding:** `12px 20px`. Page title H1 = `text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]`.
- **Content width:** cap at a sensible max (e.g. `max-w-7xl mx-auto`), 1440px desktop target.

```jsx
<header className="sticky top-0 z-40">
  <div className="flex h-10 items-center gap-4 px-4 text-white" style={{ background: 'var(--topbar)' }}>…</div>
  <nav className="flex gap-1 border-b border-[var(--line)] bg-[var(--surface)] px-5">
    <button className="relative px-3 pb-2 pt-[7px] text-[14px] font-bold text-[var(--action-hover)]">
      Home
      <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[6px]" style={{ background: 'var(--action-hover)' }} />
    </button>
  </nav>
</header>
```

---

## 12. Loading & empty states

```jsx
import { Spinner, Empty } from '../components/ui';

<Spinner label="Loading centres…" />
<Empty icon={AssignmentOutlined} title="No requests yet">
  <button className={`${btn.primary} mt-3`}>Browse packages</button>
</Empty>
```

Inline CSS spinner (no icon dependency):
```jsx
<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
```

---

## Acceptance checklist (run before every PR)

- [ ] Every colour is a token from `Color_Palette.md`; no stray hex.
- [ ] Font sizes from the spec scale; weights 400/500/600/700.
- [ ] Icons are Outlined Material at scale sizes, `currentColor`.
- [ ] Buttons match section 1 (height, padding, hover, disabled); confirm dialogs: red first, Cancel last.
- [ ] Inputs 38px (identity-modal 40px) with hover/focus/disabled/error states.
- [ ] Tables: fixed layout, ellipsis, zebra, column widths set.
- [ ] Modals: correct width, scrim, focus handling, `role="dialog"`, Escape to close.
- [ ] Labels capitalize (never uppercase); validation + toasts follow the spec.
