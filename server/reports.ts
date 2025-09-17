import type { Request, Response } from "express";
import { storage } from "./storage";

export async function weeklyFairnessReport(_req: Request, res: Response) {
  const pips = await storage.getAllPips?.();
  const terms = await storage.getTerminatedEmployees?.();

  const cohort = (id: string) =>
    (parseInt(id.slice(-2), 16) % 2 === 0 ? "A" : "B");

  const by = (arr: any[], keyFn: (x: any) => string) =>
    arr.reduce((m, x) => ((m[keyFn(x)] ??= []).push(x), m), {} as Record<string, any[]>);

  const pByC = by(pips || [], (p: any) => cohort(p.employeeId));
  const tByC = by(terms || [], (t: any) => cohort(t.employeeId));

  const report = ["A", "B"].map((c) => ({
    cohort: c,
    pip_rate: (pByC[c]?.length ?? 0),
    termination_rate: (tByC[c]?.length ?? 0),
  }));

  res.json({ generatedAt: new Date().toISOString(), report });
}

