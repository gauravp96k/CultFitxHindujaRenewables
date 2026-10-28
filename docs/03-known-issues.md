# Known Issues & Technical Debt

> Defects and inconsistencies found during the 2026-10-28 analysis. Each entry has a
> stable ID (`D#`) referenced from the architecture doc and the development plan.
> Severity: 🔴 critical · 🟠 high · 🟡 medium · 🔵 low.
>
> No code was changed to produce this list — these are observations to be scheduled.

---

## D1 — `logAudit` is imported but never exported 🔴

- **Where:** every controller does
  `const { logAudit } = require('../middleware/auditMiddleware')`, but
  `backend/middleware/auditMiddleware.js` ends with `module.exports = { protect };` —
  there is no `logAudit`.
- **Effect:** `logAudit` is `undefined`.
  - In `requestController` it's wrapped in `safeAudit` (try/catch), so opt-in submission
    survives but **no audit row is ever written**.
  - In `gymController`, `packageController`, `hrController` the bare `await logAudit(...)`
    **throws after the DB write**, so create-gym / bulk-upload / create-package /
    update-package / create-sub-admin return an error even when the write succeeded.
- **Fix:** implement and export a `logAudit(user, action, recordReference, oldToNewState)`
  that writes an `AuditTrail` document; keep `safeAudit` wrappers so audit never breaks
  the main action.

## D2 — `models/Otp.js` is a mis-pasted OptInRequest schema 🔴

- **Where:** `backend/models/Otp.js` defines `optInSchema` and calls
  `mongoose.model('OptInRequest', optInSchema)` — it has no OTP fields at all.
- **Effect:** `authController` uses `Otp` as an OTP store (`otpHash`, `expiresAt`,
  `attempts`, `lastSentAt`, `sendCount`, `windowStart`, `cleanupAt`). None of those exist
  on this schema, so OTP persistence is broken under strict mode. It also double-registers
  the `OptInRequest` model name. In production (no dev bypass) real OTP login is at risk.
  Dev mode masks it via the `123456` bypass.
- **Fix:** replace with a proper OTP schema keyed by `email`, with the fields the
  controller expects and a TTL index on `cleanupAt`/`expiresAt`.

## D3 — Hardened boot checks and middleware are never wired in 🟠

- **Where:** `config/startupCheck.js` validates `JWT_SECRET` length, `OTP_SECRET`,
  Mongo URI and mail config and `process.exit(1)`s in production on problems — but
  `server.js` never calls it. Likewise `security.apiLimiter` and the stricter
  `auditMiddleware.protect` are defined but never used.
- **Effect:** misconfiguration is not caught at boot; the general API rate limiter is off;
  the weaker `authMiddleware.protect` is the one in use.
- **Fix:** call `startupCheck()` before `connectDB()`; mount `apiLimiter`; standardise on
  one `protect` implementation.

## D4 — Controller ↔ User-schema drift 🟠

- **Where:** `hrController` queries `officialEmail` / `workLocation`; `authMiddleware`
  checks `user.status === 'Disabled'`. The current `User` model uses `email`, `location`,
  and `isActive`.
- **Effect:** HR sub-admin create/lookup operate on fields that don't exist; the disabled
  check in `authMiddleware.protect` never triggers (model has no `status`).
- **Fix:** align controllers and middleware to the current schema (`email`, `location`,
  `isActive`), or add compatibility aliases.

## D5 — `userAccess` permission is referenced but undefined 🟡

- **Where:** `GET /hr/audit-logs` uses `checkPermission('userAccess')`, but `userAccess`
  is not in the model's `PERMISSIONS` list (`viewOptIns, approveOptIns, reports,
  serviceTracking, packagesGyms`).
- **Effect:** no Sub-admin can ever pass; the route is effectively Super-Admin-only.
- **Fix:** either add `userAccess` to `PERMISSIONS` or guard the route with an existing
  permission that matches the intended access policy.

## D6 — `packageController` writes fields the schema rejects 🟠

- **Where:** `createPackage`/`getAllPackages` reference a non-existent `activeCities` field
  and `createPackage` omits the required `tier`/`city`.
- **Effect:** package creation fails schema validation; the admin "add package" path is broken.
- **Fix:** rewrite create/update to match the `Package` schema
  (`packageName, tier, durationMonths, city, corporatePriceInclGst, platformFee, gymAccess, ...`).

## D7 — Live-looking secret committed in `.env` 🔴 (security)

- **Where:** `backend/.env` contains a real-looking `SMTP_PASS` for
  `alerts@hindujarenewables.com`, alongside placeholder JWT/OTP secrets.
- **Effect:** credential exposure in version control.
- **Fix:** rotate the SMTP credential immediately, remove `.env` from history, provide a
  committed `.env.example` with keys only, and load real values from a secret manager.

## D8 — Frontend/backend tier taxonomy mismatch 🟡

- **Where:** `lib/wellness.js` uses tiers `ELITE / PRO / HOME`; the backend `Package`
  schema uses `ELITE / PRO / ELITE_ONEPASS / PRO_ONEPASS / ONEPASS`.
- **Effect:** filtering/labels can mislabel packages; normalisers paper over it but it's fragile.
- **Fix:** define one canonical tier enum shared by both sides (or a mapping table).

## D9 — Unused dependencies & dead UI paths 🔵

- **Where:** `bcryptjs` (no passwords), `passport` + `passport-saml` (no SSO code); the
  modular `pages/hr/*` screens are not wired into `App.jsx` (which renders single-file
  `HrConsole`); the Darwinbox SSO button depends on an env var that isn't set.
- **Effect:** confusion about what's live; larger install footprint.
- **Fix:** decide SSO direction (implement or remove), remove unused deps, and reconcile
  the two HR console implementations.

## D10 — No client-side session expiry handling 🟡

- **Where:** `services/api.js` has no response interceptor; `AuthContext` has no expiry logic.
- **Effect:** an expired/invalid JWT produces raw 401s with no auto-logout/redirect.
- **Fix:** add a response interceptor that clears auth and routes to login on 401.

## D11 — `mongoSanitize` is globally disabled 🟡

- **Where:** `server.js` has `app.use(security.mongoSanitize)` commented out.
- **Effect:** relies solely on per-field type guards for NoSQL-injection defence.
- **Fix:** re-enable the sanitize wrapper (the code already avoids the Express 5
  read-only `req.query` pitfall) and verify routes still work.

## D12 — No automated tests / thin npm scripts 🟡

- **Where:** backend has a failing placeholder `test` script and no `dev`/`start`;
  no test runner is configured anywhere.
- **Effect:** every change is validated manually; regressions are easy to miss.
- **Fix:** add real `start`/`dev` scripts and a test setup (see plan Phase 4).

---

## Severity rollup

| ID | Severity | Area | One-line |
|---|---|---|---|
| D1 | 🔴 | backend | `logAudit` missing export breaks audit + write endpoints |
| D2 | 🔴 | backend | `Otp` model is a wrong schema; OTP persistence broken |
| D7 | 🔴 | security | Live secret committed in `.env` |
| D3 | 🟠 | backend | startupCheck / apiLimiter / hardened protect not wired |
| D4 | 🟠 | backend | controller ↔ User schema drift |
| D6 | 🟠 | backend | packageController writes invalid fields |
| D5 | 🟡 | backend | `userAccess` permission undefined |
| D8 | 🟡 | shared | tier taxonomy mismatch |
| D10 | 🟡 | frontend | no 401 handling |
| D11 | 🟡 | backend | mongo-sanitize disabled |
| D12 | 🟡 | tooling | no tests / thin scripts |
| D9 | 🔵 | cleanup | unused deps + dead UI paths |
