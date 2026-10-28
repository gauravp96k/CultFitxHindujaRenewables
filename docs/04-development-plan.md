# Development Plan & Roadmap

> Sequenced plan to stabilise, then extend, the Cult.fit Corporate Wellness Portal.
> Ordered by dependency and risk: correctness and security first, then hardening, then
> features. Issue IDs (`D#`) refer to `03-known-issues.md`.
>
> This is a planning document only — no code has been written.

---

## Guiding principles

1. **Stop the bleeding first.** Fix defects that break core flows or leak secrets before
   building anything new.
2. **One source of truth per concept.** Resolve the duplicate `protect`, duplicate
   `OptInRequest` registration, and the two HR consoles.
3. **Make it verifiable.** Add scripts and tests so later changes can be checked.
4. **Keep changes reversible and reviewable.** Small PRs per phase item.

---

## Phase 0 — Security triage (do immediately) 🔴

| Task | Issue | Done when |
|---|---|---|
| Rotate the committed SMTP credential | D7 | New credential issued; old one revoked |
| Remove real `.env` from version control; add `.env.example` (keys only) | D7 | Repo has no live secrets; sample documents every key |
| Confirm `DEV_OTP_BYPASS` / `AUTO_PROVISION_USERS` are off in prod config | — | Verified in prod env; documented |

**Exit criteria:** no live secret in the repo; production auth cannot be bypassed.

---

## Phase 1 — Restore core correctness 🔴

Goal: every advertised flow works end to end against a real database (no dev shortcuts).

1. **Fix the audit trail (D1).** Implement + export
   `logAudit(user, action, recordReference, oldToNewState)` writing an `AuditTrail`.
   Wrap all call sites in a non-throwing `safeAudit`.
2. **Fix OTP persistence (D2).** Replace `models/Otp.js` with a real OTP schema
   (fields the controller uses, TTL index). Remove the duplicate `OptInRequest`
   registration. Verify real OTP login with the dev bypass turned **off**.
3. **Fix package management (D6).** Rewrite `createPackage` / `updatePackage` to match the
   `Package` schema; drop `activeCities`.
4. **Align HR controllers to the schema (D4).** Use `email` / `location` / `isActive`.
   Fix the disabled-user check in the active `protect`.

**Verification:** manually (and later via tests) run login → browse → opt-in → HR approve →
activate; confirm an `AuditTrail` row appears for each state change; confirm a package can
be created and a sub-admin can be created.

**Exit criteria:** the six core flows in `01-system-analysis.md` §6 all succeed with
`NODE_ENV=production`-equivalent config.

---

## Phase 2 — Wire up hardening that already exists 🟠

1. **Boot validation (D3).** Call `startupCheck()` before `connectDB()` in `server.js`.
2. **Standardise `protect` (D3).** Keep one implementation (prefer the hardened
   `auditMiddleware` version: `isActive` check + HS256 pinning); delete the other.
3. **Mount `apiLimiter` (D3).** Apply the general limiter to `/api/v1`.
4. **Re-enable mongo-sanitize (D11).** Turn the global wrapper back on; retest routes.
5. **Fix the `userAccess` permission (D5).** Add it to `PERMISSIONS` or switch the
   audit-logs route to an existing permission.

**Exit criteria:** server refuses to boot on bad config; all routes rate-limited and
sanitised; RBAC matrix in §5 holds exactly.

---

## Phase 3 — Consistency & cleanup 🟡🔵

1. **Unify the tier taxonomy (D8).** One shared enum (or explicit mapping) across
   `lib/wellness.js` and the `Package` schema.
2. **Reconcile the two HR consoles (D9).** Decide between single-file `HrConsole` and the
   modular `pages/hr/*`; remove the losing set or wire the winner into `App.jsx`.
3. **Client session handling (D10).** Add an axios response interceptor that logs out and
   redirects on 401; optional proactive expiry check in `AuthContext`.
4. **Dependency hygiene (D9).** Remove `bcryptjs`; decide SSO (keep `passport-saml` only if
   SSO is on the roadmap this quarter).

**Exit criteria:** no dead admin screens; one tier source; expired sessions handled gracefully.

---

## Phase 4 — Developer experience & tests 🟡

1. **Scripts.** Add backend `start` (`node server.js`) and `dev` (`nodemon server.js`);
   confirm frontend `dev`/`build`/`preview`/`lint`.
2. **Test setup.** Introduce a runner (e.g. node's built-in test runner or Vitest for the
   backend) with an in-memory / disposable Mongo. Prioritise:
   - auth: OTP throttle, expiry, constant-time compare, domain enforcement;
   - requests: validation, single-open-request rule, reference-ID uniqueness under concurrency;
   - rbac: each permission gate.
3. **CI (optional).** Lint + test on PR.

**Exit criteria:** `npm test` runs green locally for the prioritised suites; a clean
`npm run build` for the frontend.

---

## Phase 5 — Feature backlog (post-stabilisation)

Only after Phases 0–2 are complete. Rough priority order:

| Feature | Why | Notes |
|---|---|---|
| Darwinbox / SAML SSO | Replace OTP as primary login | Dependencies already present; needs IdP config + `passport-saml` wiring; keep OTP as fallback |
| Reports module | `reports` permission exists but has no route | CSV/PDF export of opt-ins, deductions, activation funnel |
| Payroll-deduction export | Finance hand-off | Monthly file of active members × `monthlyPayrollDeduction` |
| Admin package/gym editors in-app | Reduce reliance on seed scripts | Build on the modular `pages/hr/*` screens |
| Email notifications on status change | Keep employees informed | Reuse `mailer.js`; template per status |
| Observability | Production support | Structured logs, `/health` + `/ready`, request IDs |
| Membership renewal / expiry handling | `Expiring` status exists but isn't driven | Scheduled job to flag expiring memberships |

---

## Suggested milestones

| Milestone | Contents | Gate |
|---|---|---|
| **M1 — Secure & correct** | Phase 0 + Phase 1 | All core flows pass with prod config; no secrets in repo |
| **M2 — Hardened** | Phase 2 | Boot validation + full RBAC + rate limiting live |
| **M3 — Clean** | Phase 3 + Phase 4 | One console, one tier source, tests green |
| **M4 — Extended** | Phase 5 (chosen features) | Per-feature acceptance |

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OTP fix changes login behaviour in prod | Med | High | Test with dev bypass off before release; staged rollout |
| Removing the unused HR console breaks a hidden entry point | Low | Med | Grep for imports/routes before deleting |
| Re-enabling mongo-sanitize breaks a query path | Low | Med | Route-by-route smoke test after enabling |
| Secret rotation breaks OTP email delivery | Med | High | Rotate in a maintenance window; verify with `scripts/test-email.cjs` |
| Schema realignment affects legacy users | Med | Med | Run `fix-old-users.js` migration first; back up the collection |

---

## Definition of done (per task)

- Change is scoped to the task; no unrelated refactors.
- Backend build runs and the affected flow is exercised (manually or by test).
- For auth/security/data tasks: state what was verified and what wasn't.
- Docs updated: move the resolved `D#` out of `03-known-issues.md` and note it here.
