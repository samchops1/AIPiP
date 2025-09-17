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
- Dashboard → Auto‑Firing System → Execute Auto‑Firing (HR role).
  - Demo flow enforces “PIP before termination”: if an active employee fails the consecutive low‑performance check and is not already on a PIP, the system auto‑creates a PIP and does not terminate on that cycle.
  - Employees already on a PIP who continue to fail can be terminated. Termination letters and audit entries are generated.
- Legal/HR gate is enforced at API layer (e.g., for programmatic usage when applicable).

5) Govern and analyze (check twice)
- Analytics tabs provide:
  - Performance Distribution: mix of Excellent/Good/Average/Poor.
  - Departments & Companies: structure and risk concentration by org.
  - Coaching: effectiveness (by score bands) and volume.
  - Utilization Analysis: High/Medium/Low distribution.
  - Financial: investment, savings, ROI with editable assumptions; export JSON/CSV.
  - Improvement Rate baseline: the dashboard snapshots a pre‑offboarding improvement rate baseline when you click Execute Auto‑Firing. Post‑offboarding, the card shows delta vs this baseline (e.g., “−6% vs baseline”).
  - Fairness Snapshot: review PIP and termination rates across cohorts.

Recommended cadence for the demo:
- Check Analytics once immediately after generating sample data (baseline state).
- Run Auto‑Firing (HR only) and then return to Analytics to compare before/after (rates, distributions, ROI, and Fairness Snapshot).
- Audit Logs: verify all actions with timestamps and entities.
- Settings → Kill Switch: emergency pause of automated workflows.

---

## Tabs and Sections

### Dashboard
- Sample Data: creates a realistic dataset (safe to re‑run); “Clear” to reset.
- Auto‑Firing (HR): HR‑only demo to evaluate and list offboarding candidates.
- Terminated Employees: click an entry to view details and letters.
- Active PIP Management (preview): quick access to employee PIPs; “View Details” opens an inline modal. PIPs belonging to terminated employees are highlighted in red with a TERMINATED badge.

### PIP Management
- Create PIP (Manager): set grace period, goals, coaching plan, and required improvement.
- Update PIPs (Manager): adjust goals/plan; FSM guardrails prevent illegal status changes.
- Generate Coaching (Manager): single‑click coaching per PIP, documented and exportable.
- Visibility: includes active and terminated PIPs; terminated PIPs are shown in red (matching the dashboard behavior).

### Coaching System
- Filters:
  - Show eligible only (not terminated + has recent metric)
  - Only employees on PIP
- Bulk coaching (Manager): generate coaching sessions for all eligible PIP employees in one click.
  - Demo fallback: if no PIP employees are eligible (e.g., after auto‑firing), the system generates a small number of sessions for active, non‑terminated employees with recent metrics so the demo always shows activity.
- Coaching feedback modal: animated status, structured feedback, and PDF download.

### Analytics
- Header: export JSON or CSV with key metrics.
- Assumptions (interactive): avg salary, PIP cost, coaching cost, success rate—updates ROI live.
- Performance: distribution across score bands.
- Departments/Companies: breakdowns by org; spot concentration.
- Coaching: effectiveness (≥80/60–79/<60) and volume (total/automated/avg per employee).
- Utilization: High (≥80), Medium (60–79), Low (<60) distributions.
- Financial: investment ((#PIPs×pipCost) + (#coaching×coachingCost)), savings (PIPs×successRate×replacementCost), ROI%.
- Improvement Rate baseline: The dashboard captures the baseline on click of Auto‑Firing and the card displays the change vs baseline; this keeps your before/after story consistent even if offboarding resets the active PIP mix.

#### Fairness Snapshot (Weekly)
- What it shows: PIP and termination rates across two synthetic cohorts (A/B), assigned deterministically from employeeId. Rates are normalized by cohort size to avoid small‑cohort distortions.
- Why it matters: Provides a high‑level signal for potential disparity. If one cohort consistently has higher PIP/termination rates, review inputs and rubrics.
- Methodology (demo‑safe): Uses non‑sensitive synthetic cohorting (no protected attributes). Counts PIP proposals by unique employeeId (not total PIPs) to avoid inflation.
- Next steps: In production, wire cohorts to your real fairness dimensions behind guardrails, with legal review and opt‑in.

### Data Upload
- Upload a CSV to seed performance metrics; the system evaluates and proposes PIPs based on thresholds.

### Audit Logs
- Time‑ordered view of all actions: PIP creation/updates, coaching generated, settings changes, etc.
- Use it to prepare investigations or validate governance.

### Settings (with Kill Switch)
- PIP thresholds: score thresholds, consecutive periods, grace period days, minimum improvement.
- Emergency Controls → Kill Switch (Settings only):
  - Emergency Stop immediately pauses automated workflows (evaluate PIPs, coaching generation, termination).
  - “Reactivate System” to resume.

---

## Safety, Governance & Guardrails

- RBAC: viewer/manager/HR with server‑enforced role checks.
- Legal/HR Gate: HR‑only endpoints for termination, body schema includes sign‑off flags and risk guards.
- FSM Guardrails: single source of truth for allowed PIP transitions; illegal transitions return 409.
- PIP‑before‑termination (demo): auto‑firing first places failing active employees on a PIP; only employees already on PIP and still failing are terminated.
- Evidence Integrity: PDFs include a SHA‑256 hash; download endpoints stream from disk.
- Audit Everything: any state change writes an audit entry with timestamp and details.
- Fairness: weekly synthetic cohorts (A/B) with normalized rates; methodology visible in API and UI.
- Demo Resilience: bulk coaching includes a fallback when no PIP employees are eligible (e.g., after offboarding) so the demo always shows activity while still recording proper sessions.

---

## Recommended Demo Script (Step‑by‑Step)

1. Settings → confirm Kill Switch is off (System Active).
2. Dashboard → Sample Data → Generate Sample Data.
3. PIP Management → open a few PIP Details; generate a coaching session (Manager role).
4. Coaching System →
   - Use “Show eligible only” and “Only employees on PIP” filters.
   - Bulk generate coaching (Manager role); note the summary (Success/Skipped) and sessions added.
5. Dashboard → Review “Improvement Rate” (this is your baseline).
6. Switch role to HR → Auto‑Firing System → Execute Auto‑Firing.
   - Note: PIP‑before‑termination is enforced. Failing active employees are first placed on a PIP; only those already on a PIP and still failing are terminated.
   - Terminated PIPs are shown in red in Dashboard and PIP Management.
7. Analytics →
   - Performance Distribution, Utilization, Departments, Companies.
   - Coaching tabs: Effectiveness (≥80/60–79/<60) and Volume (Total/Automated).
   - Financial tab: adjust Assumptions (salary/PIP cost/coaching cost/success rate). Export JSON or CSV.
   - Note the Improvement Rate delta vs baseline captured just before Auto‑Firing.
8. Audit Logs → verify creation/update/termination actions with timestamps.

Pro tip: If you need to re‑run the demo cleanly, use Dashboard → Sample Data → Clear All Data, then regenerate.

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
