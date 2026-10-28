# Architecture

> Companion to `01-system-analysis.md`. Describes the intended target architecture and
> the component interactions. Where the current code diverges, that is flagged and tracked
> in `03-known-issues.md`.

---

## 1. High-level topology

```
                     ┌──────────────────────────────────────────┐
                     │              Browser (PWA)                 │
                     │  React 19 + Vite + Tailwind                │
                     │  - localStorage: token, user               │
                     │  - axios client (baseURL /api/v1)          │
                     └───────────────┬────────────────────────────┘
                                     │  HTTPS  (dev: Vite proxy /api → :5000)
                                     ▼
                     ┌──────────────────────────────────────────┐
                     │          Express 5 API (Node.js)           │
                     │  helmet · cors · rate-limit · body limits  │
                     │  JWT auth (protect) · RBAC (checkPermission)│
                     │  ┌──────────────────────────────────────┐ │
                     │  │ auth │ packages │ gyms │ requests │ hr │ │
                     │  └──────────────────────────────────────┘ │
                     └───────┬───────────────────────┬────────────┘
                             │                        │
                             ▼                        ▼
                 ┌────────────────────┐    ┌────────────────────────┐
                 │     MongoDB         │    │  Mail provider          │
                 │  users, packages,   │    │  Microsoft Graph OR SMTP│
                 │  gyms, optinrequests│    │  (OTP delivery)         │
                 │  counters, audit,   │    └────────────────────────┘
                 │  otps               │
                 └────────────────────┘
```

**Deployment assumption:** same-origin in production (frontend served behind the same
host that proxies `/api/v1` to the API), since the axios client uses a relative base URL
and `withCredentials: true`. In development, Vite's proxy (`frontend/vite.config.js`)
forwards `/api` to `http://localhost:5000`.

---

## 2. Backend layering

```
Request
  │
  ▼
[ security middleware ]  helmet, cors, body-size limits
  │
  ▼
[ router ]  /api/v1/<area>
  │
  ▼
[ protect ]  verify JWT, load User, attach req.user
  │
  ▼
[ rbac ]  superAdminOnly | checkPermission(...)      (admin routes only)
  │
  ▼
[ controller ]  validate → mutate/query → audit → respond
  │
  ▼
[ model / raw collection ]  Mongoose schema or direct collection read
```

### Design principles observed in the code
- **Snapshot-on-write:** `OptInRequest` copies employee identity and package pricing at
  submission time, so later catalog/profile changes never rewrite history.
- **Least privilege by default:** employee routes need only a valid token; every HR
  capability is gated behind a specific boolean permission or Super Admin.
- **Server is the source of truth for identity:** the opt-in's `employee` comes from the
  JWT, not the request body.
- **Idempotent seeds & migrations:** seed scripts upsert and never demote admins; `fix-*`
  scripts are safe to re-run.

---

## 3. Authentication & session flow

```
Employee            Frontend              API                 Mongo / Mail
   │  enter email      │                    │                      │
   │──────────────────▶│  POST send-otp ───▶│  validate domain     │
   │                   │                    │  throttle checks     │
   │                   │                    │  store hashed OTP ──▶ │ otps
   │                   │                    │  email OTP ─────────▶ │ Graph/SMTP
   │  enter 6-digit    │                    │                      │
   │──────────────────▶│  POST verify-otp ─▶│  constant-time match │
   │                   │                    │  find/provision user │
   │                   │                    │  sign JWT            │
   │                   │◀── {token, user} ──│                      │
   │                   │  store in localStorage                    │
   │  reload page      │  GET /auth/me ────▶│  protect → fresh user│
```

- OTP: 6 digits, 5-minute expiry, 30s resend cooldown, 5 sends/hour, 5 verify attempts.
- JWT: HS256, `{ id }`, 8h default expiry.
- **Target state:** OTP persistence must use a real OTP schema (see issue D2). The dev
  bypass (`123456`) currently hides the broken persistence in non-production.

---

## 4. Opt-in request flow (sequence)

```
Employee        Frontend (OptInForm)      API (requestController)        Mongo
   │  choose pkg    │                        │                             │
   │───────────────▶│                        │                             │
   │  fill + accept │  POST /requests ──────▶│  validateForm()             │
   │  4 declarations│                        │  check single-open-request ▶│ optinrequests
   │                │                        │  load package ─────────────▶│ packages
   │                │                        │  nextReferenceId() ────────▶│ counters
   │                │                        │  create OptInRequest ──────▶│ optinrequests
   │                │                        │  safeAudit() ──────────────▶│ audittrails*
   │                │◀── {referenceId, ...} ─│                             │
   │  print PDF     │  acknowledgement.js    │                             │
```
\* audit write currently fails silently — see issue D1.

**Reference ID:** `CF-<year>-<seq+126 padded to 5>` via the atomic `Counter`, race-safe.

---

## 5. Data model relationships

```
User ────────────┐
   1              │ employee (ref)
                  ▼
              OptInRequest ──── packageDetails.package (ref) ──▶ Package
                  │
                  │ (snapshots copied in, not live refs)
                  └── employeeSnapshot, packageDetails{...}

AuditTrail ── user (ref) ──▶ User
Counter    ── _id = "optin-<year>"          (no ref; sequence store)
Gym        ── standalone (queried by city/type)
Otp        ── keyed by email                (intended; see D2)
```

---

## 6. Frontend component architecture

```
App (AuthProvider)
 ├─ not authenticated ─────────▶ Login
 ├─ admin role ────────────────▶ HrConsole  (own sidebar layout)
 └─ employee ──────────────────▶ Navbar + view:
        home     → Home (catalog by city, compare, opt-in entry)
        compare  → CompareMatrix
        form     → OptInForm → acknowledgement PDF
        my       → MyRequests (status stepper)
        gyms     → GymLocator
        policy   → Policy (PDF)

 shared: lib/wellness.js (domain), lib/csv.js, lib/acknowledgement.js
 data:   services/api.js (authService, packageService, gymService,
                           requestService, hrService)
```

**State management:** React context for auth only; per-view local state in `App.jsx`.
No global store, no router. This is adequate for the current surface area but is a
constraint for growth (see the modularisation task in the plan).

---

## 7. Cross-cutting concerns

| Concern | Where it lives | Target direction |
|---|---|---|
| AuthN | `authMiddleware.protect` + JWT | Add refresh/expiry handling + 401 interceptor on the client |
| AuthZ | `rbacMiddleware` | Fix `userAccess` permission mismatch (D5) |
| Audit | `AuditTrail` + `logAudit` | Restore the missing `logAudit` export (D1) |
| Config safety | `startupCheck.js` | Wire it into `server.js` boot (D3) |
| Input safety | validators + mongo-sanitize | Re-enable global sanitize once query-getter issue handled |
| Secrets | `.env` | Rotate committed secret, move to a secret manager (D7) |
| Observability | `console.*` | Add structured logging + health/readiness endpoints |

---

## 8. Known architectural debt (summary)

The analysis surfaced several defects and drifts between controllers and the current
schema. They are catalogued with reproduction notes and fixes in `03-known-issues.md`
and sequenced into the roadmap in `04-development-plan.md`. The most load-bearing ones:

1. `logAudit` is imported everywhere but never exported — audit never writes and several
   write endpoints throw after their DB mutation.
2. `models/Otp.js` is a duplicated OptInRequest schema, not an OTP store.
3. `startupCheck`, the hardened `auditMiddleware.protect`, and `apiLimiter` are defined
   but never wired in.
4. Controller/model schema drift (`officialEmail`/`workLocation`/`status` vs
   `email`/`location`/`isActive`) breaks HR sub-admin features.
5. `packageController` writes a non-existent `activeCities` and omits required fields.
6. Frontend tier taxonomy differs from backend; `userAccess` permission is undefined.
7. A live-looking SMTP secret is committed in `.env`.
