# Color Palette Template

> Derived from `ACH_UI_UX_Build_Spec (1).md` (section 2 + Appendix A) and organized by
> **how to use each colour**. The spec remains the source of truth; this is the practical
> picker. Every colour is a CSS variable defined in `frontend/src/index.css` — use the
> variable, never a raw hex.

Usage in code:
- Inline style: `style={{ color: 'var(--action)' }}`
- Tailwind arbitrary value: `className="bg-[var(--action)] text-white"`
- Tailwind theme utility (exposed in `index.css @theme`): `className="bg-action text-white"`

---

## 1. Brand & action

| Swatch | Token | Hex | Use it for |
|---|---|---|---|
| 🟦 | `--action` | `#0064D9` | Primary buttons, links, checked boxes, active wizard step, focused controls |
| 🟦 | `--action-hover` | `#005AC3` | Hover on any blue control; active tab/segment text |
| 🟦 | `--brand` | `#19437A` | Brand navy: breadcrumbs, chips, matrix icons, active level button, selected option, big values |
| 🟦 | `--topbar` | `#24417A` | The host/app top bar background |

**Rule of thumb:** `--action` = "do something" (interactive). `--brand` = "this is us / emphasis" (identity, headings, selected state).

---

## 2. Text (ink) scale — darkest to lightest

| Token | Hex | Use it for |
|---|---|---|
| `--ink` | `#22293A` | Primary text, headings, key values |
| `--ink-2` | `#334155` | Body text in modals, ghost-button labels, tree text |
| `--muted` | `#4B5563` | Table cells, field labels, table headers |
| `--grey` | `#6B7280` | Idle tabs, section headings, idle segments |
| `--muted-2` | `#94A3B8` | Placeholders, breadcrumb trail, hints, chevrons |

**Pairing guide (text on `--surface` white):** headings → `--ink`; paragraphs → `--ink-2`; labels/captions → `--muted`; placeholder/hint → `--muted-2`.

---

## 3. Surfaces & lines

| Token | Hex | Use it for |
|---|---|---|
| `--bg` | `#FBFCFD` | Page background |
| `--surface` | `#FFFFFF` | Cards, modals, inputs |
| `--surface-2` | `#F8FAF9` | Table header, zebra rows, modal footers, disabled input, ghost hover |
| `--surface-3` | `#F1F5F4` | Neutral chip, count pill, caret hover |
| `--line` | `#D1D1D1` | Default 1px border |
| `--line-soft` | `#E4E9EE` | Matrix & tree borders, inner dividers |

---

## 4. Interaction tints (hover / selected)

| Token | Hex | Use it for |
|---|---|---|
| `--navy-tint` | `#EAF0F7` | Icon tiles, chips, segmented-button hover, selected list row, choice-card hover |
| `--hover-tint` | `#F2F7FE` | Hover of icon buttons, funnels, tree rows, matrix rows |
| `--selected-tint` | `#E8F1FC` | Active funnel, partial checkbox fill |
| `--segment-active` | `#DCF3FF` | Active segment in a segmented control |
| `--input-hover-border` | `#9FB4CF` | Input hover border, focused search box |

---

## 5. Status & semantic colours

Each status uses a **text colour on a soft fill**. In this app, `STATUS_STYLE` in
`frontend/src/lib/wellness.js` maps request statuses to `{ color, bg }` pairs.

| Meaning | Text token | Fill token | Example use |
|---|---|---|---|
| Success / Active / Yes | `--success-text` `#15803D` | `--success-soft` `#DCFCE7` | "Active" badge, GST-included pill, success message |
| Warning / Pending | `--warn-text` `#7C3A03` | `--warn-soft` `#FDE8B0` (border `--warn-border` `#F5CD7A`) | "HR Approved" badge, warning banner, declaration note |
| Danger / Rejected / Error | `--danger-text` `#7F1414` or `--danger` `#B91C1C` | `--danger-soft` `#FBCACA` (border `--danger-border` `#F3A5A5`) | Delete action, required `*`, error input, "Rejected" badge |
| Info / Submitted | `--action` `#0064D9` | `--selected-tint` `#E8F1FC` | "Submitted" badge, info banner |

Danger button specifics: background `--danger`, hover **stays red** `--danger-hover` `#991B1B`.

### Request-status map (as implemented)
| Status | Text | Fill |
|---|---|---|
| Submitted | `--action` | `--selected-tint` |
| HR Approved | `--warn-text` | `--warn-soft` |
| Sent to Cult.fit | `--level-7` `#7C3AED` | `#EDE9FE` |
| Active | `--success-text` | `--success-soft` |
| Rejected | `--danger` | `--danger-soft` |

---

## 6. Categorical colours (tiers / tree levels)

For things that are **different, not ranked** (package tiers, org-tree levels, chart
series), pull from the level tokens so categories stay visually distinct.

| Token | Hex | Spec role | This app (package tier) |
|---|---|---|---|
| `--level-1` | `#19437A` | Tree level 1 | **ELITE** header |
| `--level-2` | `#0064D9` | Tree level 2 | — |
| `--level-3` | `#16A34A` | Tree level 3 | — |
| `--level-4` | `#0E7490` | Tree level 4 | **HOME / OnePass** header |
| `--level-5` | `#BE185D` | Tree level 5 | ELITE + OnePass header |
| `--level-6` | `#B45309` | Tree level 6 | — |
| `--level-7` | `#7C3AED` | Tree level 7 | **PRO** header |

`TIER_STYLE` in `wellness.js`: ELITE → `--brand`, PRO → `--level-7`, HOME → `--level-4`,
OTHER → `--grey` (all with white text).

---

## 7. Utility & special-purpose

| Token | Hex | Use it for |
|---|---|---|
| `--toggle-on` | `#0A8FA8` | Status toggle in the "on" position |
| `--excel` | `#1D6F42` | Spreadsheet-export button / tile |
| `--scrim` | `rgba(15,23,42,.45)` | Modal overlay |
| `--tooltip` | `#18212B` | Tooltip / toast background (white text on it) |
| `--step-pending` | `#6B7280` | Wizard number circle (pending) |
| `--step-line` | `#C9CED6` | Wizard connector line (turns `--action` once done) |
| `--open-row` | `#F6F9FD` | Expanded matrix row, tree root row |
| `--check-border` | `#C3CCD5` | Unchecked matrix checkbox border |

---

## 8. Shadows, radius, focus (not colours, but part of the palette system)

| Token | Value | Use |
|---|---|---|
| `--shadow-card` | `0 1px 3px rgba(15,23,42,.16), 0 1px 2px rgba(15,23,42,.12)` | Cards, summary blocks, tables |
| `--shadow-overlay` | `0 24px 48px -12px rgba(15,23,42,.28)` | Modals, dropdown menus, toasts |
| `--shadow-popover` | `0 12px 32px rgba(15,23,42,.18)` | Column-filter popovers |
| `--focus-ring` | `0 0 0 3px #EAF0F7` | Input focus ring (with `border-color: var(--brand)`) |
| `--radius-btn` | `4px` | Buttons, funnels, identity-modal inputs |
| `--radius-sm` | `8px` | Checkboxes (5), segmented groups, top-bar controls |
| `--radius-md` | `10px` | Inputs, lists, review blocks, choice cards |
| `--radius-lg` | `12px` | Cards, generic modals, matrix, tree |
| `--radius-pill` | `999px` | Chips, badges, toggle, count pill |

---

## 9. Do / don't

- ✅ Use a token for every colour. ❌ No stray hex, no opacity hacks beyond the listed tints.
- ✅ `--action` for interactive blue, `--brand` for identity/emphasis. ❌ Don't swap them.
- ✅ Status = soft fill + matching text token. ❌ Don't invent new status hues.
- ✅ Categorical data → `--level-*`. ❌ Don't reuse `--danger`/`--success` for categories.
- ✅ Labels are **capitalize**, never UPPERCASE.

See `UI_Design_Templates.md` for the component patterns that use these colours, and
`style-guide` (the generated artifact) for a visual reference.
