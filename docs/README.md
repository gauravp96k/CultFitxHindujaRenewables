# Project Documentation — Cult.fit Corporate Wellness Portal

Architecture and planning docs produced from a codebase analysis on **2026-10-28**.
These are living documents; keep them in sync as the code changes.

| Doc | What's in it |
|---|---|
| [`01-system-analysis.md`](./01-system-analysis.md) | How the system works today — stack, backend map, frontend map, RBAC, business flows, security, env vars |
| [`02-architecture.md`](./02-architecture.md) | Target architecture — topology, layering, auth/opt-in sequences, data relationships, component design |
| [`03-known-issues.md`](./03-known-issues.md) | Catalogue of defects & tech debt (`D1`–`D12`) with severity and fixes |
| [`04-development-plan.md`](./04-development-plan.md) | Phased roadmap (Phase 0 security → Phase 5 features), milestones, risks |

## How to use these

- **New to the project?** Read `01` then `02`.
- **Planning work?** `03` tells you what's broken; `04` tells you the order to fix it in.
- **Fixed something?** Move the resolved `D#` out of `03` and tick it off in `04`.

## Top findings at a glance

The analysis found the core flows mostly work but surfaced several load-bearing defects:

- 🔴 `logAudit` is imported everywhere but never exported (D1).
- 🔴 `models/Otp.js` is a duplicated OptInRequest schema, not an OTP store (D2).
- 🔴 A live-looking SMTP secret is committed in `backend/.env` (D7).

Start with **Phase 0** (security triage) and **Phase 1** (restore correctness) in the plan.
