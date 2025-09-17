import type { Request, Response } from "express";
import { storage } from "./storage";

export async function weeklyFairnessReport(_req: Request, res: Response) {
  const pips = await storage.getAllPips();
  const terms = await storage.getTerminatedEmployees();
  const employees = await storage.getAllEmployees();

  const cohort = (id: string) => (parseInt(id.slice(-2), 16) % 2 === 0 ? "A" : "B");

  const by = (arr: any[], keyFn: (x: any) => string) =>
    arr.reduce((m, x) => ((m[keyFn(x)] ??= []).push(x), m), {} as Record<string, any[]>);

  // Build unique employee-level counts for PIPs and Terminations
  const uniquePipEmpIds = Array.from(new Set((pips || []).map((p: any) => p.employeeId)));
  const pipEmpObjs = uniquePipEmpIds.map(id => ({ employeeId: id }));
  const pByC = by(pipEmpObjs, (p: any) => cohort(p.employeeId));

  const termIdsFromRecords = new Set((terms || []).map((t: any) => t.employeeId));
  const termIdsFromStatus = new Set((employees || []).filter((e: any) => e.status === 'terminated').map((e: any) => e.id));
  const combinedTermIds = new Set<string>([...termIdsFromRecords, ...termIdsFromStatus]);
  const termEmpObjs = Array.from(combinedTermIds).map(id => ({ employeeId: id }));
  const tByC = by(termEmpObjs, (t: any) => cohort(t.employeeId));
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
    methodology:
      "Synthetic cohorts (A/B) are assigned deterministically by employeeId suffix to illustrate fairness monitoring without sensitive attributes. Rates are normalized by cohort population.",
    report,
  });
}

// Trend over the last N weeks (cumulative), normalized by cohort population
export async function weeklyFairnessTrend(_req: Request, res: Response) {
  const pips = await storage.getAllPips();
  const terms = await storage.getTerminatedEmployees();
  const employees = await storage.getAllEmployees();

  const cohort = (id: string) => (parseInt(id.slice(-2), 16) % 2 === 0 ? "A" : "B");
  const empByCohort = employees.reduce((m: Record<string, string[]>, e: any) => {
    const c = cohort(e.id);
    (m[c] ||= []).push(e.id);
    return m;
  }, {});

  // Build week cutoffs (last 8 weeks, inclusive, oldest first)
  const weeks: { label: string; cutoff: Date }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    const label = d.toISOString().slice(0, 10);
    weeks.push({ label, cutoff: d });
  }

  const data = weeks.map(({ label, cutoff }) => {
    const cutoffTime = cutoff.getTime();
    const uniqPipIds = new Set(
      (pips || [])
        .filter((p: any) => new Date(p.createdAt || p.startDate).getTime() <= cutoffTime)
        .map((p: any) => p.employeeId)
    );
    const uniqTermIds = new Set(
      (terms || [])
        .filter((t: any) => new Date(t.terminationDate).getTime() <= cutoffTime)
        .map((t: any) => t.employeeId)
    );

    const pipA = Array.from(uniqPipIds).filter((id) => cohort(id) === 'A').length;
    const pipB = Array.from(uniqPipIds).filter((id) => cohort(id) === 'B').length;
    const termA = Array.from(uniqTermIds).filter((id) => cohort(id) === 'A').length;
    const termB = Array.from(uniqTermIds).filter((id) => cohort(id) === 'B').length;

    const sizeA = (empByCohort['A']?.length || 0) || 1;
    const sizeB = (empByCohort['B']?.length || 0) || 1;

    return {
      week: label,
      pip_rate_A: pipA / sizeA,
      pip_rate_B: pipB / sizeB,
      term_rate_A: termA / sizeA,
      term_rate_B: termB / sizeB,
      pip_count_A: pipA,
      pip_count_B: pipB,
      term_count_A: termA,
      term_count_B: termB,
      sizeA,
      sizeB,
    };
  });

  res.json({ generatedAt: new Date().toISOString(), data });
}

// Raw detail (IDs) for current snapshot
export async function weeklyFairnessDetail(_req: Request, res: Response) {
  const pips = await storage.getAllPips();
  const terms = await storage.getTerminatedEmployees();

  const cohort = (id: string) => (parseInt(id.slice(-2), 16) % 2 === 0 ? "A" : "B");
  const uniquePipIds = Array.from(new Set((pips || []).map((p: any) => p.employeeId)));
  const uniqueTermIds = Array.from(new Set((terms || []).map((t: any) => t.employeeId)));

  const detail = {
    A: {
      pip_ids: uniquePipIds.filter((id) => cohort(id) === 'A'),
      term_ids: uniqueTermIds.filter((id) => cohort(id) === 'A'),
    },
    B: {
      pip_ids: uniquePipIds.filter((id) => cohort(id) === 'B'),
      term_ids: uniqueTermIds.filter((id) => cohort(id) === 'B'),
    },
  };

  res.json({ generatedAt: new Date().toISOString(), detail });
}
