import type { Request, Response } from "express";
import { storage } from "./storage";

export async function weeklyFairnessReport(_req: Request, res: Response) {
  const pips = await storage.getAllPips?.();
  const terms = await storage.getTerminatedEmployees?.();
  const employees = await storage.getAllEmployees?.();

  const cohort = (id: string) =>
    (parseInt(id.slice(-2), 16) % 2 === 0 ? "A" : "B");

  const by = (arr: any[], keyFn: (x: any) => string) =>
    arr.reduce((m, x) => ((m[keyFn(x)] ??= []).push(x), m), {} as Record<string, any[]>);

  // Count unique employees proposed for PIP to avoid inflating counts when multiple PIPs exist
  const pipEmpIds = Array.from(new Set((pips || []).map((p: any) => p.employeeId))).map(id => ({ employeeId: id }));
  const pByC = by(pipEmpIds, (p: any) => cohort(p.employeeId));
  const tByC = by(terms || [], (t: any) => cohort(t.employeeId));
  const eByC = by(employees || [], (e: any) => cohort(e.id));

  const report = ["A", "B"].map((c) => {
    const cohortSize = (eByC[c]?.length ?? 0) || 1;
    const pip_count = (pByC[c]?.length ?? 0);
    const termination_count = (tByC[c]?.length ?? 0);
    const pip_rate = pip_count / cohortSize;
    const termination_rate = termination_count / cohortSize;
    return { cohort: c, cohortSize, pip_count, termination_count, pip_rate, termination_rate };
  });

  res.json({
    generatedAt: new Date().toISOString(),
    methodology: "Synthetic cohorts (A/B) are assigned deterministically by employeeId suffix to illustrate fairness monitoring without sensitive attributes. Rates are normalized by cohort population.",
    report,
  });
}
