# Hinduja Renewables - UI/UX Build Specification

_Exact fonts, sizes, padding, colours, Material icons, component CSS and behaviour - so any developer or AI builds the same frontend_

> Note: For an AI assistant: this document is the single source of truth for how the frontend must look and behave. Follow it exactly. Use only the tokens, sizes and icons defined here; do not invent values. Appendix A holds the CSS variables. Values were measured from the reference wireframe at 1440 x 900.

## 0. Non-negotiable rules
1. Colours only from section 2. No new hex values, no opacity tricks except those listed. Use the CSS variables in Appendix A.
2. Font: var(--font) = -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif. Weights 400 / 500 / 600 / 700 only. Sizes only from the scale in section 3; nothing smaller than 11px (12px for wizard and dialog buttons; the only exception is the 10px info mark, see section 5). Base is 14px / 400 / line-height 1.55.
3. Icons: Material Icons Outlined, from @mui/icons-material (<NameOutlined />), only those listed in section 5. Colour is currentColor; size from the scale (12, 14, 15, 16, 17, 18px). Do not mix in other icon sets, emoji or text glyphs (no "+", "x" or "v" characters as icons).
4. Spacing / radius / shadow / heights only from section 4. Border is 1px solid var(--line) unless stated.
5. Every interactive element has hover, :focus-visible, and (where it can be unavailable) disabled states exactly as given in section 6. Transitions: colour/background .12s.
6. Dialogs: role="dialog", aria-modal, labelled by the title; focus moves in, Tab is trapped, focus returns on close; Escape and scrim click both run the dialog's cancel action. In confirm dialogs the destructive red button comes first and Cancel is last (text button).
7. Never change a component's size, padding or radius "to fit". If a layout needs a new component, compose it from these ones.
8. Layout target is 1440px wide desktop; breakpoints in section 4.6 are the only responsive rules.

## 1. Page frame

Host top bar (fixed, 40px) is provided by the platform. The app owns everything below it, inside main { padding: 12px 20px }. The page is fit-to-window: html and body never scroll; main is a flex column with overflow-y: auto and the active page fills the height under the top bar, so the registers, data-access tree, permission matrix and Preview blocks scroll inside their own cards, not the page.

## 2. Colour tokens

| Variable | Value | Use |
| --- | --- | --- |
| --action | #0064D9 | Primary action blue: buttons, links, row-action icons, checked boxes, text buttons, active wizard step |
| --action-hover | #005AC3 | Hover of every blue control; active tab; active segment text |
| --brand | #19437A | Brand navy: breadcrumb links, chips, matrix icons, active level button, sheet-preview header, selected option |
| --topbar | #24417A | Host top bar background |
| --navy-tint | #EAF0F7 | Icon tiles, chips, segmented-button hover, selected list row, choice-card hover |
| --hover-tint | #F2F7FE | Hover of icon buttons, funnels, tree rows, matrix rows |
| --selected-tint | #E8F1FC | Active funnel, partial checkbox fill |
| --segment-active | #DCF3FF | Active segment (segmented control) |
| --input-hover-border | #9FB4CF | Input hover, focused search box, sheet-preview footer border |
| --ink | #22293A | Primary text, headings |
| --ink-2 | #334155 | Body text in modals, ghost-button label, tree text |
| --muted | #4B5563 | Table cells, field labels, table headers |
| --muted-2 | #94A3B8 | Placeholders, breadcrumb trail, hints, chevrons |
| --grey | #6B7280 | Idle tab, section heading, idle segments |
| --bg | #FBFCFD | Page background |
| --surface | #FFFFFF | Cards, modals, inputs |
| --surface-2 | #F8FAF9 | Table header, zebra rows, modal footers, disabled input, ghost hover |
| --surface-3 | #F1F5F4 | Neutral chip, count pill, caret hover |
| --line | #D1D1D1 | Default 1px border |
| --line-soft | #E4E9EE | Matrix and tree borders |
| --danger | #B91C1C | Danger button, delete icon, required *, error text, error input border |
| --danger-hover | #991B1B | Danger button hover, delete icon hover |
| --danger-soft | #FBCACA | Delete hover fill, error-input focus ring, danger note |
| --danger-border | #F3A5A5 | Danger note border |
| --danger-text | #7F1414 | Text on danger note |
| --warn-soft | #FDE8B0 | Warning banner, warning note |
| --warn-border | #F5CD7A | Warning note border |
| --warn-text | #7C3A03 | Text and icon on warning surfaces |
| --success-text | #15803D | Active / Yes badge text |
| --success-soft | #DCFCE7 | Active / Yes badge fill |
| --toggle-on | #0A8FA8 | Status toggle on |
| --excel | #1D6F42 | Spreadsheet-export tile |
| --scrim | rgba(15,23,42,.45) | Modal overlay |
| --text-btn-hover-bg | #F3F3F3 | Hover fill of text buttons (Cancel, Back, Next) |
| --text-btn-hover-border | #AAAAAA | Hover outline of text buttons |
| --step-pending | #6B7280 | Wizard number circle (pending); pending label #4B5563 |
| --step-line | #C9CED6 | Wizard connector line; turns --action once the step it leaves is done |
| --open-row | #F6F9FD | Expanded matrix row, tree root row (hover #EEF4FD) |
| --check-border | #C3CCD5 | Unchecked matrix checkbox border |
| --tree-glyph-border | #B7C3CF | Tree expand box border |
| --tree-line | #C5CFDA | Tree connector lines |
| --tooltip | #18212B | About tooltip background |
| --level-1 | #19437A | Tree level 1 icon |
| --level-2 | #0064D9 | Tree level 2 icon |
| --level-3 | #16A34A | Tree level 3 icon |
| --level-4 | #0E7490 | Tree level 4 icon |
| --level-5 | #BE185D | Tree level 5 icon (optional level) |
| --level-6 | #B45309 | Tree level 6 icon |
| --level-7 | #7C3AED | Tree level 7 icon |

## 3. Typography

Font stack above. All labels are text-transform: capitalize (never uppercase). Numbers in tables use tabular figures.

| Role | Size | Weight | Line-height | Letter-spacing | Transform | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| Page title (H1) | 22px | 700 | 34.1px | -0.22px | none | #22293A |
| Section heading | 16px | 600 | 24.8px | -0.08px | none | #6B7280 |
| Body | 14px | 400 | 21.7px | 0 | none | #22293A |
| Tab (idle) | 14px | 500 | 21.7px | 0 | none | #6B7280 |
| Breadcrumb link | 12.5px | 600 | 19.38px | 0 | none | #19437A |
| Table header | 11px | 700 | 17.05px | 0.33px | capitalize | #4B5563 |
| Table cell | 12.5px | 400 | 19.38px | 0 | none | #4B5563 |
| Name link | 14px | 400 | 21.7px | 0 | none | #0064D9 |
| Button | 13px | 700 | 20.15px | 0 | none | #FFFFFF |
| Button small | 12px | 700 | 18.6px | 0 | none | #334155 |
| Wizard / dialog footer button | 12px | 700 | 18.6px | 0 | none | #FFFFFF |
| Field label | 11px | 700 | 17.05px | 0.33px | capitalize | #4B5563 |
| Input | 13px | 400 | 20.15px | 0 | none | #22293A |
| Modal title (generic) | 12px | 700 | 18.6px | 0 | none | #22293A |
| Modal body | 13px | 400 | 20.15px | 0 | none | #334155 |
| Matrix column header | 11px | 700 | 17.05px | 0.66px | capitalize | #4B5563 |
| Matrix module title | 13.5px | 700 | 17.55px | 0 | none | #22293A |
| Matrix hint | 11px | 500 | 14.3px | 0 | none | #94A3B8 |
| Summary heading | 11.5px | 700 | 17.83px | 0.46px | capitalize | #22293A |
| Key label | 11px | 700 | 17.05px | 0.33px | capitalize | #4B5563 |
| Key value | 13.5px | 700 | 20.93px | 0 | none | #22293A |
| Chip | 12px | 700 | 18.6px | 0 | none | #19437A |
| Badge | 11px | 700 | 17.05px | 0 | none | #15803D |
| Timeline title | 12.5px | 700 | 17.5px | 0 | none | #22293A |
| Timeline meta | 11px | 400 | 17.05px | 0 | none | #4B5563 |
| Sheet-preview title | 15px | 700 | 23.25px | 0 | none | #22293A |
| Top bar account name | 12px | 700 | 14.4px | 0 | none | #FFFFFF |
| Top bar search input | 12px | 400 | 18.6px | 0 | none | #FFFFFF |

Modal header title inside identity modals is a <strong> at 12px (bold). Field labels, table headers, key labels and timeline meta are 11px. Placeholder colour is --muted-2.

## 4. Layout, size, shape

### 4.1 Spacing

Page padding 12px 20px. Card padding 16px (table cards 0), card margin-bottom 16px.

Gaps: button rows 8, toolbars 10, list action row 16, sections and grids 16-18, form label-to-input 6 (5 in identity modals), form grid 14px 18px.

Table: header cell 10px 18px, body cell 7px 18px, list footer 5px 18px.

Modal padding: see 4.5.

### 4.2 Control heights

46 matrix item row - 40 identity-modal input, top bar - 38 field input/select - 36 button, list search, custom dropdown - 34 tree row, matrix search / segmented group, tree-level buttons - 32 segment button, role filter, top-bar icon - 30 small button, wizard footer buttons, top-bar search, modal close - 28 identity-modal footer button - 26 row-action icon - 24 wizard number circle.

### 4.3 Radius

4 buttons, funnel, identity-modal inputs - 5 checkbox, caret - 6 small icon buttons - 7 dropdown option - 8 segmented groups, top-bar controls, identity modals - 9 icon tiles - 10 inputs, lists, review blocks, choice card - 12 cards, generic modals, matrix, tree - 14 timeline modal - 999px chips, badges, toggle, count pill.

### 4.4 Shadows and motion

Card --shadow-card (cards, summary blocks, checkbox card, tree, sheet preview). Overlay --shadow-overlay (modals, dropdown menus). Popover --shadow-popover (column filter). Tooltip --shadow-tooltip.

Input focus: border-color: var(--brand); box-shadow: var(--focus-ring). Icon-button focus: outline: 2px solid var(--action); outline-offset: 1px. Top-bar icon focus: white outline.

Motion: colour/background 0.12s - toggle knob 0.15s - dropdown chevron 0.15s - matrix caret 0.18s - progress bar 0.25s - tab underline 0.28s cubic-bezier(.4,0,.2,1).

### 4.5 Modal sizes (design width, 1440x900)

Scrim var(--scrim), z-index 100, centred. Generic shell: header 12px 20px 12px/700, body 8px 20px 13px --ink-2 (max-height 70vh, scrolls), footer 4px 20px on --surface-2, right-aligned, gap 10, radius 12, standard 36px buttons. Identity shell: radius 8, header 4px 20px with 24px icon box and 30px close button, body 18px 20px 20px, footer 4px 20px, 24px buttons.

| Modal | Shell | Width px | Radius | Header / body / footer padding |
| --- | --- | --- | --- | --- |
| Identity form dialog | identity | 540 | 8px | 4px 20px / 18px 20px 20px / 4px 20px |
| Large selector dialog (identity shell, radius 12) | identity (radius 12) | 880 | 12px | 12px 20px / 8px 20px / 4px 20px |
| Form dialog | generic | 640 | 12px | 12px 20px / 8px 20px / 4px 20px |
| Confirm dialog | generic | 460 | 12px | 12px 20px / 8px 20px / 4px 20px |
| Timeline dialog | generic | 650 (max 92vw) | 14px | 4px 18px / 10px 18px 14px 24px / - |
| List dialog | generic | 640 | 12px | 12px 20px / 8px 20px / - |
| Wide preview / sheet dialog | generic | 960 (full screen: 100vw - 32) | 12px | 12px 20px / 18px / 4px 20px |

### 4.6 Breakpoints

1080 two-column panels stack - 860 action rows stack, top bar simplifies - 780 wizard bar side columns shrink to 90px and labels go 11px (numbers stay) - 720/680 modal grids become one column - 560 only first top-bar icon.

## 5. Icons (Material Outlined)

import SearchOutlined from '@mui/icons-material/SearchOutlined'; <SearchOutlined sx={{ fontSize: 16 }} />. The parent's color colours the icon. Row actions: 16px. Buttons: 14px. Search fields: 15px. Top bar: 18px. Matrix module tiles: 17px inside a 32px tile.

| MUI component | Material name | Where used | Size and colour |
| --- | --- | --- | --- |
| SearchOutlined | search | Search (Top bar search); Search (list search boxes); Search (matrix search) | 15px #94A3B8, 15px #FFFFFF |
| HelpOutlineOutlined | help_outline | Help (Top bar) | 18px #FFFFFF |
| TuneOutlined | tune | Settings (Top bar) | 18px #FFFFFF |
| HistoryOutlined | history | History (Top bar); Timeline (row action); Timeline (timeline modal header, CSS background image) | 18px #FFFFFF, 16px #0064D9 |
| ExpandMoreOutlined | expand_more | Chevron down (Top bar account menu); Chevron down (Dropdown selects) | 14px #94A3B8, 10px #FFFFFF |
| HomeOutlined | home | Home (Breadcrumb) | 14px #19437A |
| GroupOutlined | group | Tab icon; panel title; matrix module icon | 16px #005AC3, 18px #0064D9, 17px #19437A |
| VerifiedUserOutlined | verified_user | Tab icon; matrix module icon | 16px #6B7280, 17px #19437A |
| FilterAltOutlined | filter_alt | Column filter (Table column headers); filled variant FilterAlt when the column filter is active | 12px #8A94A0 |
| EditOutlined | edit | Edit (row action); Edit details (page header); Edit (matrix column header); Edit access (button) | 16px #0064D9, 16px #19437A, 14px #334155 |
| DeleteOutlined | delete | Delete (row action); Delete (matrix column header) | 16px #B91C1C, 16px #19437A |
| UnfoldMoreOutlined | unfold_more | Expand all (matrix toolbar) | 14px #334155 |
| UnfoldLessOutlined | unfold_less | Collapse all (matrix toolbar) | 14px #334155 |
| VisibilityOutlined | visibility | View (matrix column header); Preview (preview modal header) | 16px #19437A, 16px #0064D9 |
| AddBoxOutlined | add_box | Create (matrix column header) | 16px #19437A |
| FileDownloadOutlined | file_download | Export (matrix column header) | 16px #19437A |
| WarningAmberOutlined | warning_amber | Warning triangle (edit banner) | - |
| WorkOutlined | work | Tree level 2 (level tab / tree) | 16px #0064D9, 14px #334155 |
| PlaceOutlined | place | Tree level 3 (level tab / tree); summary block | 16px #16A34A, 14px #334155, 14px #19437A |
| Inventory2Outlined | inventory_2 | Tree level 6 (level tab / tree); matrix module icon | 16px #B45309, 14px #334155, 17px #19437A |
| MapOutlined | map | Tree level 4 (level tab / tree) | 16px #0E7490, 14px #0E7490 (white on the active level button) |
| LayersOutlined | layers | Tree level 7 (level tab / tree) | 16px #7C3AED, 14px #FFFFFF |
| SignpostOutlined | signpost | Tree level 5 (level tab / tree; optional level) | 16px #BE185D, 14px #BE185D (white on the active level button) |
| CancelOutlined | cancel | Clear (button) | 14px #334155 |
| PersonOutlined | person | Summary block | 14px #19437A |
| SecurityOutlined | security | Summary block; form modal header | 14px #19437A, 16px #0064D9 |
| DashboardOutlined | dashboard | Summary block; matrix module icon | 14px #19437A, 17px #19437A |
| LockOutlined | lock | Summary block | 14px #19437A |
| CloseOutlined | close | Close (Modal close button); Close (generic modal headers) | 17px #4B5563, 16px #4B5563 |
| PersonAddOutlined | person_add | Form modal header | 16px #0064D9 |
| AccountTreeOutlined | account_tree | Choice modal header | 16px #0064D9 |
| ContentCopyOutlined | content_copy | Choice card | 18px #19437A |
| AddOutlined | add | Choice card; "+ Create" button; tree expand box (collapsed) | 18px #19437A, 14px currentColor |
| FullscreenOutlined | fullscreen | Full screen (list toolbar) | 16px #4B5563 |
| TableViewOutlined | table_view | Download (sheet-preview modal); Export button (green #1D6F42, 16px) | 16px #FFFFFF |
| ChevronRightOutlined | chevron_right | Caret right (matrix expand caret) | 14px #19437A |
| ApartmentOutlined | apartment | Tree level 1 (level tab / tree) | 16px #19437A |
| DescriptionOutlined | description | Matrix module icon | 17px #19437A |
| BuildOutlined | build | Matrix module icon | 17px #19437A |
| AssignmentOutlined | assignment | Matrix module icon | 17px #19437A |
| InventoryOutlined | inventory | Matrix module icon | 17px #19437A |
| LocalShippingOutlined | local_shipping | Matrix module icon | 17px #19437A |
| CheckCircleOutlineOutlined | check_circle_outline | Matrix module icon | 17px #19437A |
| NotificationsNoneOutlined | notifications_none | Notifications (matrix module icon) | - |
| ScheduleOutlined | schedule | Matrix module icon | 17px #19437A |
| ArrowUpwardOutlined | arrow_upward | Sort ascending (column header) | 15px #19437A |
| ArrowDownwardOutlined | arrow_downward | Sort descending (column header) | 15px #19437A |
| SwapVertOutlined | swap_vert | Sortable, not sorted (column header) | 15px #4B5563 |
| ArrowDropDownOutlined | arrow_drop_down | Status header, all statuses; Preview tree parent glyph | 15px #4B5563, 14px |
| RemoveOutlined | remove | Tree expand box (expanded) | 14px #5B6672 |
| CheckOutlined | check | Success message | 13px #19437A |
| FiberManualRecordOutlined | fiber_manual_record | Preview tree leaf glyph | 14px |

Extra icon rules: the Export button uses TableViewOutlined at 16px in --excel green (no tile). Tree expand boxes are 20x20, radius 4, border #B7C3CF, with RemoveOutlined (expanded) / AddOutlined (collapsed) at 14px. Tree and Preview level icons are coloured by kind (--level-* tokens). The page-title info mark is NOT an icon: it stays the text character U+1D456 (written &#x1D456; in HTML) - 12x12 circle, background: #D4DDE7, white glyph 10px/700 (the only text below 11px), hover background: #B1B9C1 plus box-shadow: 0 0 0 4px rgba(0,100,217,.2), sits 7px above the baseline. "+ Create" buttons use AddOutlined 14px before the label. Success messages start with CheckOutlined 13px. In the review/preview tree, parents show ArrowDropDownOutlined and leaves FiberManualRecordOutlined at 14px.

## 6. Components (exact CSS as rendered)

Values below are the computed styles from the reference wireframe. Colours refer to tokens in section 2.

### 6.1 Frame

**Top bar**

```css
font: 400 14px/21.7px var(--font); color: #FFFFFF; background: #24417A; border: 0; padding: 0px 16px; height: 40px;
```

**Top bar search box**

```css
font: 400 14px/21.7px var(--font); color: #FFFFFF; background: #FFFFFF @5%; border: 1px solid #FFFFFF @85%; border-radius: 8px; padding: 0px 6px 0px 10px; width: 480px; height: 30px;
```

**Top bar icon button**

```css
font: 400 13.33px/13.33px var(--font); color: #FFFFFF; border: 0; border-radius: 8px; padding: 1px 6px; height: 32px;
/* hover */ background: #FFFFFF @14%
```

**Breadcrumb link**

```css
font: 600 12.5px/19.38px var(--font); color: #19437A; border: 0;
/* hover */ text-decoration: underline
```

**Page title H1**

```css
font: 700 22px/34.1px var(--font); letter-spacing: -0.22px; color: #22293A; border: 0;
```

**Tab (idle)**

```css
font: 500 14px/21.7px var(--font); color: #6B7280; border: 0; padding: 7px 12px 8px 12px; height: 36.7px;
/* hover */ color: #0064D9
```

**Tab (active)**

```css
font: 700 14px/21.7px var(--font); color: #005AC3; border: 0; padding: 7px 12px 8px 12px; height: 36.7px;
```

**Tab underline (3px, slides)**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #005AC3; border: 0; border-radius: 6px 6px 0px 0px; width: 168px; height: 3px;
```

### 6.2 Buttons

Order in a footer: primary first, then text/secondary. Disabled: opacity: .5; cursor: not-allowed (no hover change).

**Primary**

```css
font: 700 13px/20.15px var(--font); color: #FFFFFF; background: #0064D9; border: 0; border-radius: 4px; padding: 0px 16px; height: 36px;
/* hover */ background: #005AC3
```

**Secondary (ghost)**

```css
font: 700 13px/20.15px var(--font); color: #334155; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 4px; padding: 0px 16px; height: 36px;
/* hover */ background: #F8FAF9
```

**Danger (hover stays red: #991B1B)**

```css
font: 700 13px/20.15px var(--font); color: #FFFFFF; background: #B91C1C; border: 0; border-radius: 4px; padding: 0px 16px; height: 36px;
/* hover */ background: #991B1B
```

**Small ghost**

```css
font: 700 12px/18.6px var(--font); color: #334155; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 4px; padding: 0px 12px; height: 30px;
/* hover */ background: #F8FAF9
```

**Wizard footer primary**

```css
font: 700 12px/18.6px var(--font); color: #FFFFFF; background: #0064D9; border: 0; border-radius: 4px; padding: 0px 14px; height: 30px;
/* hover */ background: #005AC3
```

**Wizard footer Back / Cancel text button**

```css
font: 700 12px/18.6px var(--font); color: #0064D9; border: 1px solid transparent; border-radius: 4px; padding: 0px 14px; height: 30px;
/* hover */ color: #005AC3; background: #F3F3F3; border-color: #AAAAAA
```

**Wizard footer bar (sticky, under every wizard step)**

```css
position: sticky; bottom: -12px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 12px -20px -12px; padding: 4px 20px; background: #FFFFFF; border-top: 1px solid #D1D1D1; box-shadow: 0 -6px 12px -8px rgba(15,23,42,.18); z-index: 30;
Contents: Back (text button) first, then the primary action (for example Save & Next, Save or Preview).
```

**Identity-modal footer primary**

```css
font: 700 12px/18.6px var(--font); color: #FFFFFF; background: #0064D9; border: 0; border-radius: 4px; padding: 0px 10px; height: 28px;
/* hover */ background: #005AC3
```

**Identity-modal footer Cancel**

```css
font: 700 12px/18.6px var(--font); color: #0064D9; border: 1px solid transparent; border-radius: 4px; padding: 0px 10px; height: 28px;
/* hover */ color: #005AC3; background: #F3F3F3; border-color: #AAAAAA
```

**Dialog Cancel / Close (generic modals)**

```css
font: 700 13px/20.15px var(--font); color: #0064D9; border: 1px solid transparent; border-radius: 4px; padding: 0px 16px; height: 36px;
/* hover */ color: #005AC3; background: #F3F3F3; border-color: #AAAAAA
```

Pagination: Previous is a small ghost that becomes solid --action (white text, hover --action-hover) when enabled; Next is a small text button in --action. Both 30px, 0 12px, 12px/700, radius 4, opacity .5 when disabled. Link button (Reset, Clear): no box, 12px/700, --brand, underlined.

### 6.3 Icon buttons

**Row action - edit / history (delete uses --danger, hover --danger-hover on --danger-soft)**

```css
font: 400 13.33px/13.33px var(--font); color: #0064D9; border: 0; border-radius: 6px; width: 26px; height: 26px;
/* hover */ color: #005AC3; background: #F2F7FE
```

**Row action - delete**

```css
font: 400 13.33px/13.33px var(--font); color: #B91C1C; border: 0; border-radius: 6px; width: 26px; height: 26px;
/* hover */ color: #991B1B; background: #FBCACA
```

**Edit-details pencil**

```css
font: 400 13.33px/13.33px var(--font); color: #0064D9; border: 0; border-radius: 6px; width: 28px; height: 28px;
/* hover */ color: #005AC3; background: #F2F7FE
```

**Modal close (identity modals)**

```css
font: 400 13.33px/13.33px var(--font); color: #4B5563; border: 0; border-radius: 8px; width: 30px; height: 30px;
/* hover */ color: #22293A; background: #F1F5F4
```

**Column filter funnel (active: fill --selected-tint, filled icon)**

```css
font: 400 13.33px/13.33px var(--font); color: #8A94A0; border: 0; border-radius: 4px; width: 18px; height: 18px;
/* hover */ color: #0064D9; background: #F2F7FE
```

### 6.4 Inputs and dropdowns

**Text input (identity modal; hover border --input-hover-border; focus border --brand + focus ring)**

```css
font: 400 13px/20.15px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #19437A; border-radius: 4px; padding: 0px 12px; width: 241px; height: 40px; box-shadow: rgb(234, 240, 247) 0px 0px 0px 3px;
```

**Text input disabled / auto-filled (generated IDs)**

```css
font: 700 13px/20.15px var(--font); color: #4B5563; background: #F8FAF9; border: 1px solid #D1D1D1; border-radius: 4px; padding: 0px 12px; width: 241px; height: 40px;
```

**Standard field input / search in a page**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 0px 12px; width: 272px; height: 38px;
```

**List search box (focus-within border --input-hover-border)**

```css
font: 400 13px/20.15px var(--font); color: #94A3B8; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 0px 12px; width: 340px; height: 36px;
```

**Dropdown trigger (hover --surface-2; open: border --input-hover-border, chevron rotates 180deg, --brand)**

```css
font: 400 13px/20.15px var(--font); color: #334155; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 0px 12px; width: 379.8px; height: 36px;
/* hover */ background: #F8FAF9
```

**Dropdown menu**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 6px; width: 379.8px; height: 125px; box-shadow: rgba(15, 23, 42, 0.28) 0px 24px 48px -12px;
```

**Dropdown option (single-select and multi-select look the same)**

```css
font: 600 13px/20.15px var(--font); color: #334155; border: 0; border-radius: 7px; padding: 9px 12px;
/* hover */ background: #F2F7FE;  /* selected / ticked */ background: #19437A; color: #FFFFFF; a white check icon (16px) at the right edge. Multi-select: the native checkbox is hidden and the whole row is the click target.
```

Field label: see Typography (Field label); required marker = red * (--danger) after the label; helper note "Auto filled" 11px/500 --muted, no capitalisation. Validation: error border-color: --danger, background stays --surface, and on hover/focus the ring is 0 0 0 3px --danger-soft; message 11.5px/600 --danger (margin-top 5); success message 11.5px/600 --brand ("Username is available").

### 6.5 Tabs, segmented groups, badges

**Segmented container**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 8px; width: 273.2px; height: 34px;
```

**Segment idle**

```css
font: 600 12.5px/19.38px var(--font); color: #6B7280; border: 0; padding: 0px 14px; height: 32px;
/* hover */ color: #0064D9; background: #F2F7FE
```

**Segment active**

```css
font: 700 12.5px/19.38px var(--font); color: #005AC3; background: #DCF3FF; border: 0; padding: 0px 14px; height: 32px;
```

**Count pill idle**

```css
font: 700 11px/17.05px var(--font); color: #6B7280; background: #F1F5F4; border: 0; border-radius: 9px; padding: 0px 6px; height: 18px;
```

**Count pill active**

```css
font: 700 11px/17.05px var(--font); color: #005AC3; background: #FFFFFF; border: 0; border-radius: 9px; padding: 0px 6px; height: 18px;
```

**Level buttons container**

```css
font: 700 13px/20.15px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 8px; width: auto (one button per tree level); height: 36px;
```

**Level button idle**

```css
font: 600 12px/18.6px var(--font); color: #334155; border: 0; padding: 0px 11px; height: 34px;
/* hover */ color: #19437A; background: #EAF0F7
```

**Level button active**

```css
font: 600 12px/18.6px var(--font); color: #FFFFFF; background: #19437A; border: 0; padding: 0px 11px; height: 34px;
```

**Badge Active / Yes**

```css
font: 700 11px/17.05px var(--font); color: #15803D; background: #DCFCE7; border: 0; border-radius: 999px; padding: 3px 9px; height: 23px;
```

**Badge Inactive / No**

```css
font: 700 11px/17.05px var(--font); color: #6B7280; background: #F1F5F4; border: 0; border-radius: 999px; padding: 3px 9px; height: 23px;
```

**Chip primary**

```css
font: 700 12px/18.6px var(--font); color: #19437A; background: #EAF0F7; border: 0; border-radius: 999px; padding: 5px 11px; height: 28.6px;
```

**Chip neutral**

```css
font: 700 12px/18.6px var(--font); color: #334155; background: #F1F5F4; border: 0; border-radius: 999px; padding: 5px 11px; height: 28.6px;
```

Chip "removed": --danger on --danger-soft, line-through. Badge has a 6px leading dot in currentColor, gap 5.

### 6.6 Toggle, checkbox

Toggle: 38x21, radius 999, off --line, on --toggle-on, knob 17px white at left 2px (on: 19px), 0.15s.

Matrix checkbox 18x18, radius 5, border 1.5px --check-border, white. Hover: border --brand + focus ring. On: fill/border --action with white tick. Partial: fill --selected-tint, border --action, 2px dash --action. Not supported: 10x2px dash #D3DAE1. Locked: no hover.

Native checkboxes use accent-color: list/tree --action (list --brand), sizes 16/17/15/18.

### 6.7 Table

Fixed layout, cells nowrap + ellipsis (full text in title), zebra on visible rows, no row hover, 13 rows per page. Column widths are set per table in percent (numeric columns centred). Actions cell: three 26px icon buttons, gap 2.

**Card wrapper**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 12px; box-shadow: rgba(15, 23, 42, 0.16) 0px 1px 3px 0px, rgba(15, 23, 42, 0.12) 0px 1px 2px 0px;
```

**Header cell (sortable: hover colour --ink-2; indicators swap_vert / arrow_upward / arrow_downward)**

```css
font: 700 11px/17.05px var(--font); letter-spacing: 0.33px; text-transform: capitalize; color: #4B5563; background: #F8FAF9; border: 0; padding: 10px 18px;
```

**Body cell**

```css
font: 400 12.5px/19.38px var(--font); color: #4B5563; border: 0; padding: 7px 18px;
```

**Zebra row**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #F8FAF9; border: 0;
```

**Name link (hover underline)**

```css
font: 400 14px/21.7px var(--font); color: #0064D9; border: 0;
/* hover */ text-decoration: underline
```

**List footer (Showing 1-13 of n, pagination right)**

```css
font: 400 14px/21.7px var(--font); color: #22293A; border: 1px solid #D1D1D1; padding: 5px 18px;
```

### 6.8 Wizard bar

Numbered circles joined by lines. Grid of three columns, 200px | 1fr | 200px (90px | 1fr | 90px under 780px), padding 8px 0 4px, margin-bottom 4px; each step is a column: 24px number circle on top, label centred below (gap 8). Pending circle --step-pending (#6B7280) with white number; done and current circle --action. A 2px connector (--step-line #C9CED6) runs between circle centres (top 11px); it turns --action once the step it leaves is done. Labels: pending #4B5563 / 600, done #22293A / 700, current --action / 700.

**Step label - current**

```css
font: 700 13px/16.9px var(--font); color: #0064D9; text-align: center; gap: 8px; border: 0; padding: 0;
```

**Step label - pending (done: color #22293A, weight 700)**

```css
font: 600 13px/16.9px var(--font); color: #4B5563; text-align: center; gap: 8px; border: 0; padding: 0;
/* done */ color: #22293A; font-weight: 700
```

**Number circle (pending / done / current)**

```css
font: 700 12px/15.6px var(--font); color: #FFFFFF; background: #6B7280 (pending) / #0064D9 (done and current); border: 0; border-radius: 50%; width: 24px; height: 24px;
```

### 6.9 Matrix (module / action grid)

Header 58px sticky; action columns View, Create, Edit, Delete, Export (92px, inline preview 74px); module row 58px (open: fill --open-row + inset 3px --brand left rule); item row 46px; depth-2 row fill --surface-2; indent = 12px + 28px x depth; guide lines #CFD9D6; progress bar 44x4 track --surface-3 with navy gradient fill; legend footer 12px 18px --surface-2; scroll max-height 640 (full page 745, inline preview 430); min-width 700 (inline 560).

**Matrix shell**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #E4E9EE; border-radius: 12px;
```

**Header cell**

```css
font: 700 11px/17.05px var(--font); letter-spacing: 0.66px; text-transform: capitalize; color: #4B5563; background: #F8FAF9; border: 0; padding: 0px 10px 0px 18px;
```

**Module icon tile (icon 17px)**

```css
font: 400 12.5px/19.38px var(--font); color: #19437A; background: #EAF0F7; border: 1px solid #CDEEE4; border-radius: 9px; width: 32px; height: 32px;
```

**Module title**

```css
font: 700 13.5px/17.55px var(--font); color: #22293A; border: 0;
```

**Hint**

```css
font: 500 11px/14.3px var(--font); color: #94A3B8; border: 0;
```

**Legend footer**

```css
font: 400 11.5px/17.83px var(--font); color: #4B5563; background: #F8FAF9; border: 1px solid #E4E9EE; padding: 12px 18px;
```

### 6.10 Tree

Up to seven levels (level 1 = root); an optional level may be skipped. Container radius 12, border --line-soft, shadow card, max-height 590. Row 34px, padding 0 16px, gap 10, bottom border --line-soft, hover --hover-tint. Checkbox 17px in a fixed left column; expand box 20x20, radius 4, with "-" / "+" (margin-left = level x 26px); level icon 16px coloured by kind (--level-* tokens); connector lines 1px --tree-line. A search box filters to matches plus ancestors.

**Root row (level 0)**

```css
font: 700 13px/20.15px var(--font); color: #22293A; background: #F6F9FD; border: 0; padding: 0px 16px;
```

**Level 1 row**

```css
font: 700 12.5px/19.38px var(--font); color: #22293A; border: 0; padding: 0px 16px;
```

**Level 2 to 5 and 7 rows**

```css
font: 400 12.5px/19.38px var(--font); color: #334155; border: 0; padding: 0px 16px;
```

**Level 6 row (muted text)**

```css
font: 400 12.5px/19.38px var(--font); color: #4B5563; border: 0; padding: 0px 16px;
```

**Expand box (hover border --action)**

```css
font: 600 11px/11px var(--font); color: #5B6672; background: #FFFFFF; border: 1px solid #B7C3CF; border-radius: 4px; width: 20px; height: 20px;
/* hover */ color: #334155; background: #F1F5F4; border-color: #0064D9
```

### 6.11 Cards and blocks

**Summary block**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 16px 18px; box-shadow: rgba(15, 23, 42, 0.16) 0px 1px 3px 0px, rgba(15, 23, 42, 0.12) 0px 1px 2px 0px;
```

**Summary heading**

```css
font: 700 11.5px/17.83px var(--font); letter-spacing: 0.46px; text-transform: capitalize; color: #22293A; border: 0; padding: 0px 0px 12px 0px;
```

**Summary icon tile (icon 14px)**

```css
font: 700 11.5px/17.83px var(--font); letter-spacing: 0.46px; text-transform: capitalize; color: #19437A; background: #EAF0F7; border: 0; border-radius: 7px; width: 26px; height: 26px;
```

**Checkbox card**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; box-shadow: rgba(15, 23, 42, 0.16) 0px 1px 3px 0px, rgba(15, 23, 42, 0.12) 0px 1px 2px 0px;
```

**Warning banner**

```css
font: 400 12.5px/18.75px var(--font); color: #7C3A03; background: #FDE8B0; border: 0; padding: 10px 14px;
```

**Warning note**

```css
font: 400 12.5px/19.38px var(--font); color: #7C3A03; background: #FDE8B0; border: 1px solid #F5CD7A; border-radius: 8px; padding: 10px 12px;
```

**Choice card (hover: border --brand, fill --navy-tint, ring)**

```css
font: 400 13px/20.15px var(--font); color: #000000; background: #FFFFFF; border: 1px solid #D1D1D1; border-radius: 10px; padding: 16px;
/* hover */ background: #EAF0F7; border-color: #19437A; box-shadow: rgb(234, 240, 247) 0px 0px 0px 3px
```

### 6.12 Modal parts

**Identity modal box**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #FFFFFF; border: 0; border-radius: 8px; box-shadow: rgba(15, 23, 42, 0.28) 0px 24px 48px -12px;
```

**Identity header**

```css
font: 700 12px/18.6px var(--font); color: #22293A; border: 0; padding: 4px 20px;
```

**Identity body**

```css
font: 400 13px/20.15px var(--font); color: #334155; background: #FFFFFF; border: 0; padding: 18px 20px 20px 20px;
```

**Identity footer**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #F8FAF9; border: 1px solid #D1D1D1; padding: 4px 20px;
```

**Generic header**

```css
font: 700 12px/18.6px var(--font); color: #22293A; border: 0; padding: 12px 20px;
```

**Generic body**

```css
font: 400 13px/20.15px var(--font); color: #334155; border: 0; padding: 8px 20px;
```

**Generic footer**

```css
font: 400 14px/21.7px var(--font); color: #22293A; background: #F8FAF9; border: 1px solid #D1D1D1; padding: 8px 20px;
```

**Timeline row**

```css
font: 400 12.5px/19.38px var(--font); color: #334155; border: 0; border-radius: 9px; padding: 12px 10px 12px 24px;
```

**Timeline timestamp pill**

```css
font: 400 11px/17.05px var(--font); color: #4B5563; background: #F8FAF9; border: 1px solid #D1D1D1; border-radius: 999px; padding: 4px 7px;
```

**Sheet-preview table header**

```css
font: 700 11.5px/17.83px var(--font); color: #FFFFFF; background: #19437A; border: 1px solid #19437A; padding: 8px 10px;
```

**Sheet-preview footer strip**

```css
font: 400 11px/17.05px var(--font); color: #4B5563; background: #F8FAF9; border: 1px solid #9FB4CF; border-radius: 12px; padding: 11px 16px;
```

Popovers: column-filter popover 240px wide, padding 8, --surface, radius 10, --shadow-popover, search 30px (radius 7, 12.5px), list max-height 220, rows padding 5px 6px radius 6 hover --hover-tint, footer count 11.5px + "Clear" link button. About tooltip: --tooltip bg, white 11.5px/500, padding 7px 10px, radius 7, max-width 260, 5px arrow.

## 7. Feedback

Toast: bottom-centre, --tooltip background, white 12.5px/500, padding 9px 16px, radius 8, fades after 2.6s ("Saved", "Deleted" ...).

## 8. Acceptance checklist (run before every PR)
- [ ] Every colour is a --token from the Appendix A tokens; no stray hex.
- [ ] Font sizes come from section 3; weights are 400/500/600/700.
- [ ] Icons are Outlined Material from the section 5 list, at scale sizes, currentColor.
- [ ] Buttons match 6.2 (height, padding, font, hover, disabled); confirm dialogs: red first, Cancel last text button.
- [ ] Inputs 38px / identity-modal 40px with the exact hover, focus, disabled and error states.
- [ ] Tables: fixed layout, ellipsis, zebra, 13 rows/page, column widths as specified.
- [ ] Modal widths, radius and padding equal the section 4.5 table; scrim, focus trap, Escape, role="dialog".
- [ ] Validation messages and toasts follow section 7.

## Appendix A - tokens.css (paste into the app's global stylesheet)

```css
/* Design tokens. Use these variables; do not hard-code colours. */
:root {
  --action: #0064D9;
  --action-hover: #005AC3;
  --brand: #19437A;
  --topbar: #24417A;
  --navy-tint: #EAF0F7;
  --hover-tint: #F2F7FE;
  --selected-tint: #E8F1FC;
  --segment-active: #DCF3FF;
  --input-hover-border: #9FB4CF;
  --ink: #22293A;
  --ink-2: #334155;
  --muted: #4B5563;
  --muted-2: #94A3B8;
  --grey: #6B7280;
  --bg: #FBFCFD;
  --surface: #FFFFFF;
  --surface-2: #F8FAF9;
  --surface-3: #F1F5F4;
  --line: #D1D1D1;
  --line-soft: #E4E9EE;
  --danger: #B91C1C;
  --danger-hover: #991B1B;
  --danger-soft: #FBCACA;
  --danger-border: #F3A5A5;
  --danger-text: #7F1414;
  --warn-soft: #FDE8B0;
  --warn-border: #F5CD7A;
  --warn-text: #7C3A03;
  --success-text: #15803D;
  --success-soft: #DCFCE7;
  --toggle-on: #0A8FA8;
  --excel: #1D6F42;
  --scrim: rgba(15,23,42,.45);
  --text-btn-hover-bg: #F3F3F3;
  --text-btn-hover-border: #AAAAAA;
  --step-pending: #6B7280;
  --step-line: #C9CED6;
  --open-row: #F6F9FD;
  --check-border: #C3CCD5;
  --tree-glyph-border: #B7C3CF;
  --tree-line: #C5CFDA;
  --tooltip: #18212B;
  --level-1: #19437A;
  --level-2: #0064D9;
  --level-3: #16A34A;
  --level-4: #0E7490;
  --level-5: #BE185D;
  --level-6: #B45309;
  --level-7: #7C3AED;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --radius-btn: 4px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 3px rgba(15,23,42,.16), 0 1px 2px rgba(15,23,42,.12);
  --shadow-overlay: 0 24px 48px -12px rgba(15,23,42,.28);
  --shadow-popover: 0 12px 32px rgba(15,23,42,.18);
  --shadow-tooltip: 0 8px 24px rgba(15,23,42,.20);
  --focus-ring: 0 0 0 3px #EAF0F7;
}
body { font: 400 14px/1.55 var(--font); color: var(--ink); background: var(--bg); }
```
