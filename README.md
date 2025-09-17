# AIPiP: Production-Shaped Highlights

Why this is production-shaped (fast to trust, easy to scale)

- Safety & Governance
  - Role-gated writes with `x-demo-role` middleware (manager/hr); demo kill-switch via `DRY_RUN=true`.
  - Finite State Machine enforces legal PIP transitions (no accidental jumps).
  - Legal/HR gate + risk-flag hold (protected class / leave / whistleblower) before any termination.
  - Immutable audits on every action; termination PDF sha256 evidence hashing.

- Measurement & Fairness
  - Weekly fairness report API (synthetic cohorts) for PIP/termination deltas.

- Operability
  - OpenAPI spec in `docs/openapi.yaml`.
  - Replit runbook: set `DRY_RUN=true` in Secrets to demo safely.

Quick cURL examples

Evaluate PIPs (role: manager)

```sh
curl -s -X POST http://localhost:5000/api/evaluate-pips \
  -H 'x-demo-role: manager'
```

Try to offboard (blocked if DRY_RUN=true)

```sh
curl -s -X POST http://localhost:5000/api/evaluate-terminations \
  -H 'x-demo-role: hr' \
  -H 'Content-Type: application/json' \
  -d '{"legal_signoff": true, "hr_signoff": true, "risk_flags":[]}'
```

Docs

- OpenAPI spec: `docs/openapi.yaml`
- To preview: install a viewer (e.g., Redocly CLI) and run locally.

