# Cult.fit Corporate Wellness Portal — System Analysis

> **Status:** Context document. Captures how the system works *today* (as read from the
> codebase), before any changes. No code was modified to produce this document.
>
> **Last analysed:** 2026-10-28

---

## 1. What this product is

A corporate gym-membership portal for **HREPL (Hinduja Renewables Energy Pvt. Ltd.)**
employees. Employees log in with their corporate email, browse Cult.fit wellness
packages priced for the company, opt in to a package (with a 3-month payroll deduction),
and HR staff approve and track each membership through to activation.

- **Backend:** Node.js + Express 5, MongoDB via Mongoose 9.
- **Frontend:** React 19 + Vite 8 + Tailwind 4, shipped as an installable PWA.
- **Auth:** passwordless email OTP, issuing an 8-hour HS256 JWT.
- **No SSO yet:** `passport` / `passport-saml` are dependencies and a Darwinbox SSO
  button exists in the UI, but no SSO code is implemented.

---

## 2. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js | Express 5 |
| Database | MongoDB | Mongoose 9 ODM; some reads bypass Mongoose and hit raw collections |
| Auth | JWT (HS256) | 8h expiry, token in `localStorage` |
| OTP delivery | Microsoft Graph **or** SMTP | auto-selected from env (`config/mailer.js`) |
| Frontend | React 19 | No router — a `currentView` state machine in `App.jsx` |
| Styling | Tailwind CSS 4 | via `@tailwindcss/vite` |
| Build | Vite 8 | dev proxy `/api` → `localhost:5000`; PWA via `vite-plugin-pwa` |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize | see §7 |

---

## 3. Backend map

### 3.1 Entry point — `backend/server.js`
- Loads env, connects Mongo (`config/db.js`), applies `helmet` + `cors`.
- Body limits: `/api/v1/gyms/bulk-upload` gets `1mb`; everything else `10kb`.
- Mounts 5 routers under `/api/v1`: `auth`, `packages`, `gyms`, `requests`, `hr`.
- `GET /` is a health check. Listens on `PORT` (default 5000).

### 3.2 Data models — `backend/models/`

| Model | Purpose | Key fields |
|---|---|---|
| **User** | Employee / admin accounts | `employeeId` (partial-unique), `email` (unique), `role` (`Employee`/`Sub-admin`/`Super Admin`), `permissions{}` (5 booleans), `isActive` |
| **Gym** | Gym centres | `gymName`, `type` (ELITE/PRO/ONEPASS), `city`, `address`, `googleMapsLink`, `isActive` |
| **Package** | Rate-card rows (product × city × duration) | `packageName`, `tier`, `durationMonths` (1/3/6/12), `city`, `corporatePriceInclGst`, `platformFee` (80), `gymAccess[]`; unique `{tier,city,durationMonths}` |
| **OptInRequest** | An employee's membership request | `referenceId` (`CF-YYYY-#####`), `employee` ref, `employeeSnapshot`, `packageDetails` snapshot, `formData`, `activationStatus` (8 states) |
| **Counter** | Atomic sequence | `{_id, seq}` for reference IDs |
| **AuditTrail** | Immutable action log | `user`, `role`, `action`, `recordReference`, `oldToNewState` |
| **Otp** | *Intended* OTP store | **See defect D2 — this file is a mis-paste of the OptInRequest schema** |

**Opt-in status lifecycle (`STATUSES`):**
`Submitted → HR Approved → Sent to Cult.fit → Active` (plus `Expiring`, `Issue`,
`To cancel`, `Rejected`). An employee may hold only **one** request in an *open* state
(`OPEN_STATUSES` = all except `To cancel`/`Rejected`) at a time.

### 3.3 Controllers — `backend/controllers/`
- **authController** — `sendOtp`, `verifyOtp`, `me`. Enforces corporate domain, hashes
  OTPs, throttles sends/attempts, issues JWT, bootstraps super admins from
  `SUPER_ADMIN_EMAILS`. Dev-only `DEV_OTP_BYPASS` (`123456`) and `AUTO_PROVISION_USERS`.
- **requestController** — opt-in create (heavy validation, single-open-request rule,
  identity snapshot from JWT not form, 3-month deduction, race-safe reference ID),
  `getMyRequests`, `getAllOptIns` (HR filters + search), `updateRequestStatus`.
- **catalogController** — read-only `getPackages`/`getGyms`; these are the handlers the
  routes actually use for catalog reads (query raw collections, with regex escaping).
- **gymController** — `createGym`, `bulkUploadGyms` (upsert loop).
- **packageController** — `createPackage`, `updatePackage`.
- **hrController** — `getDashboardKPIs`, `getAuditLogs`, `createSubAdmin`, `getUsersAccessList`.

### 3.4 Routes & guards — `backend/routes/`

| Method & path | Guard |
|---|---|
| `POST /auth/send-otp` | IP rate limit |
| `POST /auth/verify-otp` | IP rate limit |
| `GET /auth/me` | `protect` |
| `GET /packages` | `protect` |
| `POST /packages`, `PUT /packages/:id` | `protect` + `superAdminOnly` |
| `GET /gyms` | `protect` |
| `POST /gyms`, `POST /gyms/bulk-upload` | `protect` + `checkPermission('packagesGyms')` |
| `POST /requests`, `GET /requests/my-requests` | `protect` |
| `GET /requests/hr/all` | `protect` + `checkPermission('viewOptIns')` |
| `PATCH /requests/:id/status` | `protect` + `checkPermission('approveOptIns','serviceTracking')` |
| `GET /hr/dashboard-kpis` | `checkPermission('viewOptIns')` |
| `GET /hr/audit-logs` | `checkPermission('userAccess')` ⚠ see D5 |
| `GET /hr/users-access`, `POST /hr/sub-admin` | `superAdminOnly` |

### 3.5 Middleware — `backend/middleware/`
- **authMiddleware.protect** — the one every route imports. Verifies JWT, loads user.
- **auditMiddleware.protect** — a second, hardened `protect` that is **never imported**.
- **rbacMiddleware** — `superAdminOnly`, `adminOnly`, `checkPermission(...perms)`
  (Super Admin always passes; Sub-admin needs ≥1 listed permission).

### 3.6 Config — `backend/config/`
- **db.js** — Mongo connect, exits process on failure.
- **security.js** — `helmet`, `cors` allow-list, rate limiters, mongo-sanitize wrapper.
- **mailer.js** — Graph or SMTP, auto-selected; branded HTML OTP email.
- **startupCheck.js** — validates secrets & mail config; **never invoked** (see D3).

### 3.7 Utilities & scripts
- **utils/otp.js** — 6-digit OTP via `crypto.randomInt`; HMAC-SHA256 hash; constant-time compare.
- **seed/seed-cultfit.cjs** — import packages + gyms JSON (upsert, `--dry-run`).
- **seed/seed-employees.cjs** — import employee CSV into Users; never demotes existing admins.
- **fix-*.js** — one-off **mongosh** index/migration scripts (not Node).
- **createTestUser.js** — Node script that creates a sample employee.

---

## 4. Frontend map

### 4.1 Routing — `App.jsx` / `main.jsx`
- No react-router. A `currentView` state machine switches between
  `home | compare | form | my | gyms | policy | hr`.
- No token → `<Login>`. Admin role → standalone `<HrConsole>`. Otherwise Navbar + view.
- `main.jsx` registers the PWA service worker.

### 4.2 Auth — `context/AuthContext.jsx`
- `token` + `user` kept in `localStorage`. `login()` / `logout()`. No client-side
  refresh/expiry handling; relies on backend 401s.

### 4.3 Pages — `frontend/src/pages/`
`Login`, `Home`, `Catalog`, `CompareMatrix`, `OptInForm`, `MyRequests`, `GymLocator`,
`Policy`, `HrConsole` (the active admin console). `pages/hr/*` holds a modular alternate
set of admin screens (`HrDashboard`, `HrOptIns`, `HrApprovals`, `HrAudit`, `HrGyms`, `HrPackages`).

### 4.4 Shared code
- **components/layout/Navbar.jsx**, **components/ui.jsx** (Banner, Field, buttons, cards).
- **lib/wellness.js** — the shared domain layer: cities, durations, tiers, status styles,
  INR formatting, role helpers, normalisers, and a `SAMPLE_PACKAGES` fallback.
- **lib/acknowledgement.js** — prints a branded acknowledgement PDF via hidden iframe.
- **lib/csv.js** — dependency-free CSV import/export with formula-injection guarding.

### 4.5 API client — `services/api.js`
- Single axios instance, `baseURL: '/api/v1'`, `withCredentials: true`.
- Request interceptor injects `Authorization: Bearer <token>`.
- No response interceptor for 401 auto-logout.

---

## 5. Roles & permissions (RBAC)

| Capability | Employee | Sub-admin | Super Admin |
|---|:---:|:---:|:---:|
| Browse packages / gyms | ✅ | ✅ | ✅ |
| Submit / view own opt-in | ✅ | ✅ | ✅ |
| View all opt-ins + KPIs | — | `viewOptIns` | ✅ |
| Approve / reject | — | `approveOptIns` | ✅ |
| Mark Sent / Active + member ID | — | `serviceTracking` | ✅ |
| Add gym / bulk upload | — | `packagesGyms` | ✅ |
| Reports | — | `reports` (defined, no route yet) | ✅ |
| Package create / update | — | — | ✅ |
| User access list / sub-admin mgmt | — | — | ✅ |

Super Admin bypasses every permission check and is bootstrapped from `SUPER_ADMIN_EMAILS`.

---

## 6. Core business flows

1. **OTP login** — corporate email → `send-otp` (throttled, HMAC-hashed OTP emailed) →
   `verify-otp` (constant-time compare, 5 attempts) → JWT + public user → localStorage.
2. **Employee onboarding** — HR runs `seed-employees.cjs` with a CSV master. Dev mode can
   auto-provision unknown corporate emails on first login.
3. **Opt-in** — pick package → fill form → `POST /requests` (validate, single-open-request,
   snapshot, assign `CF-YYYY-#####`, status `Submitted`) → downloadable acknowledgement.
4. **Catalog** — `GET /packages?city=` and `GET /gyms?city=&type=&q=`.
5. **Approval** — HR moves `activationStatus` forward; `Active` requires a Cult.fit member ID.
6. **Management** — Super Admin CRUD on packages; permissioned gym add / bulk upload.

---

## 7. Security measures in place

- Helmet headers; CORS allow-list (`CLIENT_URL`).
- Per-IP + per-email rate limiting on auth routes.
- 10kb global body cap (1mb only for gym bulk upload).
- OTPs stored HMAC-hashed; constant-time compare; never in plaintext.
- JWT HS256 with explicit algorithm pinning.
- Server-side input validation + regex escaping; NoSQL-injection type guards.
- Identity for opt-ins taken from the JWT, never the form (OWASP A04).
- CSV formula-injection prevention and HTML escaping in generated docs/emails.
- Dev bypass + auto-provision automatically disabled when `NODE_ENV=production`.

---

## 8. Environment variables (keys only)

**Backend `.env`:** `PORT`, `NODE_ENV`, `MONGO_URI` (or `MONGODB_URI`), `CLIENT_URL`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, `OTP_SECRET`, `CORPORATE_DOMAIN`, `SUPER_ADMIN_EMAILS`,
`DEV_OTP_BYPASS`, `AUTO_PROVISION_USERS`, `MAIL_PROVIDER`,
`SMTP_HOST/PORT/SECURE/USER/PASS` (+ `EMAIL_*` aliases),
`MAIL_FROM/MAIL_FROM_NAME/MAIL_FROM_ADDRESS`,
`GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET/SENDER`, `PACKAGE_COLLECTION`, `GYM_COLLECTION`.

**Frontend:** `VITE_DARWINBOX_SSO_URL`.

See `03-known-issues.md` for a security finding about committed secrets.
