# Trilogy AI HR Management System — End‑to‑End User Guide

This guide explains what the product does, how to use it end‑to‑end, and how roles (RBAC) control actions. It is written for interview reviewers and end users to understand the capabilities, workflows, and safeguards quickly.

## Purpose

Trilogy AI HR Management System is an AI‑native performance management tool that:
- Continuously evaluates employee performance and proposes Performance Improvement Plans (PIPs).
- Generates targeted, automated coaching.
- Supports Human‑in‑the‑Loop (HITL) decisions with strict legal/HR gates.
- Enables compliant, documented termination decisions for persistent non‑performance.
- Surfaces fairness, cohort, and financial metrics so leaders can govern outcomes with confidence.

Key design goals:
- Safety first: role‑gated writes, legal/HR gate, and a system Kill Switch.
- Predictability: FSM guardrails prevent illegal status jumps.
- Auditability: every action logged; PDFs include hash fingerprints.
- Transparency: analytics and exports for CFO/HR review.

---

## Roles (RBAC) and who can do what

Use the Role switcher in the header to simulate the following roles:

- Viewer
  - Read‑only across the app (analytics, dashboards, logs).
- Manager
  - Create/update PIPs, generate coaching, upload data.
  - Cannot execute offboarding/termination.
- HR
  - Everything managers can do, plus HR‑only actions:
    - Execute auto‑firing demo (offboarding evaluation).
    - Approve final termination flows after legal/HR gate.

The app enforces roles server‑side and also hides/guards HR‑only UI actions.

---

## End‑to‑End Workflow (10–15 minutes)

1) Load or generate data
- Option A: Quick demo — Dashboard → Sample Data → “Generate Sample Data” (creates employees, metrics, PIPs, coaching).
- Option B: Real data — Data Upload → provide CSV with: `employee_id, period, score, utilization, tasks_completed, date`.

2) Review performance and PIP proposals
- Go to PIP Management to see active PIPs with progress, dates, and scores.
- Click “View Details” (modal) to inspect goals and coaching plan.
- Managers can create new PIPs or update existing ones.

3) Generate coaching (HITL)
- PIP Management: Generate coaching for any card.
- Coaching System: use filters
  - Show eligible only (not terminated + has metrics)
  - Only employees on PIP
  - Bulk generate for all active PIPs (Manager role)
- Coaching sessions are logged, PDF reports can be downloaded.

4) Legal/HR gate and offboarding demo (HR only)
- Dashboard → Auto‑Firing System → Execute Auto‑Firing (HR role). This evaluates consecutive non‑performance and surfaces terminations with letters and audit entries.
- Legal/HR gate is enforced at API layer (e.g., for programmatic usage when applicable).

5) Govern and analyze
- Analytics tabs provide:
  - Performance Distribution: mix of Excellent/Good/Average/Poor.
  - Departments & Companies: structure and risk concentration by org.
  - Coaching: effectiveness (by score bands) and volume.
  - Utilization Analysis: High/Medium/Low distribution.
  - Financial: investment, savings, ROI with editable assumptions; export JSON/CSV.
- Audit Logs: verify all actions with timestamps and entities.
- Settings → Kill Switch: emergency pause of automated workflows.

---

## Tabs and Sections

### Dashboard
- Sample Data: creates a realistic dataset (safe to re‑run); “Clear” to reset.
- Auto‑Firing (HR): HR‑only demo to evaluate and list offboarding candidates.
- Terminated Employees: click an entry to view details and letters.
- Active PIP Management (preview): quick access to employee PIPs; “View Details” opens an inline modal.

### PIP Management
- Create PIP (Manager): set grace period, goals, coaching plan, and required improvement.
- Update PIPs (Manager): adjust goals/plan; FSM guardrails prevent illegal status changes.
- Generate Coaching (Manager): single‑click coaching per PIP, documented and exportable.

### Coaching System
- Filters:
  - Show eligible only (not terminated + has recent metric)
  - Only employees on PIP
- Bulk coaching (Manager): generate coaching sessions for all eligible PIP employees in one click.
- Coaching feedback modal: animated status, structured feedback, and PDF download.

### Analytics
- Header: export JSON or CSV with key metrics.
- Assumptions (interactive): avg salary, PIP cost, coaching cost, success rate—updates ROI live.
- Performance: distribution across score bands.
- Departments/Companies: breakdowns by org; spot concentration.
- Coaching: effectiveness (≥80/60–79/<60) and volume (total/automated/avg per employee).
- Utilization: High (≥80), Medium (60–79), Low (<60) distributions.
- Financial: investment ((#PIPs×pipCost) + (#coaching×coachingCost)), savings (PIPs×successRate×replacementCost), ROI%.

### Data Upload
- Upload a CSV to seed performance metrics; the system evaluates and proposes PIPs based on thresholds.

### Audit Logs
- Time‑ordered view of all actions: PIP creation/updates, coaching generated, settings changes, etc.
- Use it to prepare investigations or validate governance.

### Settings (with Kill Switch)
- PIP thresholds: score thresholds, consecutive periods, grace period days, minimum improvement.
- Emergency Controls → Kill Switch:
  - Emergency Stop immediately pauses automated workflows (evaluate PIPs, coaching generation, termination).
  - “Reactivate System” to resume.

---

## Safety, Governance & Guardrails

- RBAC: viewer/manager/HR with server‑enforced role checks.
- Legal/HR Gate: HR‑only endpoints for termination, body schema includes sign‑off flags and risk guards.
- FSM Guardrails: single source of truth for allowed PIP transitions; illegal transitions return 409.
- Evidence Integrity: PDFs include a SHA‑256 hash; download endpoints stream from disk.
- Audit Everything: any state change writes an audit entry with timestamp and details.
- Fairness: weekly synthetic cohorts (A/B) with normalized rates; methodology visible in API and UI.

---

## Financial Model (Interview‑Ready)

App (client) ROI model with editable inputs:
- Savings = `pipEmployees × pipSuccessRate × (avgSalary × 50%)` (conservative replacement cost proxy).
- Investment = `(#PIPs × pipCost) + (#coachingSessions × coachingCost)`.
- ROI% = `(Savings − Investment) / Investment × 100`.
- Export JSON & CSV to share with Finance.

Recommended talk track:
- Value Saved = Manager time saved + Avoided replacements (+ optional legal avoidance).
- Cost = Infra per employee + PIP admin + coaching compute.
- ROI% = (Value − Cost) / Cost; keep inputs as sliders to sanity‑check ranges.

---

## Quick Role Cheatsheet

- Viewer: review dashboards, analytics, audit logs—no writes.
- Manager: PIPs (create/update), coaching (single/bulk), data upload.
- HR: everything above + offboarding workflows.

---

## Tips for a Great Demo

- Start in Settings → confirm system is Active (Kill Switch off).
- Generate Sample Data on the Dashboard; then open PIP Management and Coaching System.
- Switch to Manager to show coaching generation; then switch to HR and run the Auto‑Firing demo.
- Walk through Analytics tabs; adjust assumptions to show ROI levers and export a CSV.
- Open Audit Logs to prove every action is captured.

---

## API Notes (for power users)

- Role header: `x-demo-role: viewer|manager|hr` (the UI sets this automatically).
- Key endpoints:
  - `POST /api/upload-csv` — load metrics
  - `POST /api/pips` — create PIP (Manager)
  - `PUT /api/pips/:id` — update PIP (Manager, FSM‑guarded)
  - `POST /api/generate-coaching` — coaching session (Manager)
  - `POST /api/auto-fire/demo` — offboarding demo (HR)
  - `GET /api/reports/fairness/weekly` — fairness snapshot (normalized)
  - `GET /api/coaching-sessions/all` — all coaching sessions for analytics

If you need deeper information (e.g., OpenAPI spec), see `docs/openapi.yaml`.

---

## Appendix: Data & PDFs

- PDFs are generated to `generated_pdfs/` with content hashes.
- Download via `/api/download-pdf/:filename`.
- PIP, coaching, termination letters contain context and audit snippets.

---

If you have any questions or want a guided walkthrough, start from the Dashboard, switch roles via the header, and follow the workflow above. This app is intentionally interview‑ready: safe, governed, and easy to explain.

