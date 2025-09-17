type RoiInputs = {
  employees: number;
  recovered: number;       // count of PIPs that closed via recovery
  terminated: number;      // count of PIPs that ended in termination
  currentTtdDays: number;  // measured “time to decision” (flag -> approved PIP)
  avgSalary: number;       // optional: for replacement cost baseline
};

function num(name: string, def: number) {
  const v = parseFloat(String(process.env[name] ?? ""));
  return Number.isFinite(v) ? v : def;
}

const cfg = {
  baselineMgrHrsPer100   : () => num("ROI_BASELINE_MGR_HOURS_PER_100", 8),
  automatedMgrHrsPer100  : () => num("ROI_AUTOMATED_MGR_HOURS_PER_100", 2),
  loadedMgrRate          : () => num("ROI_LOADED_MGR_RATE", 90),
  infraPerEmployee       : () => num("ROI_INFRA_PER_EMPLOYEE", 0.08),
  replacementCostPct     : () => num("ROI_REPLACEMENT_COST_PCT", 0.5),
  pipSuccessRate         : () => num("ROI_PIP_SUCCESS_RATE", 0.35),
  baselineTtdDays        : () => num("ROI_BASELINE_TTD_DAYS", 21),
};

export function computeRoi(inputs: RoiInputs) {
  const employees = Math.max(0, inputs.employees);
  const recovered = Math.max(0, inputs.recovered);
  const terminated = Math.max(0, inputs.terminated);
  const denom = Math.max(1, recovered + terminated);

  // 1) Manager time savings (dominant lever)
  const hoursSavedPer100 = Math.max(0, cfg.baselineMgrHrsPer100() - cfg.automatedMgrHrsPer100());
  const hoursSaved = (employees/100) * hoursSavedPer100;
  const valueSavedManager = hoursSaved * cfg.loadedMgrRate();

  // 2) Avoided replacement cost from successful PIPs
  // If you have avgSalary in storage, pass it; else treat as 0 and this term vanishes.
  const replacementCost = (inputs.avgSalary || 0) * cfg.replacementCostPct();
  const pipSuccessRate = cfg.pipSuccessRate();
  const avoidedReplacements = Math.round((recovered + terminated) * pipSuccessRate); // conservative proxy
  const valueSavedReplacement = avoidedReplacements * replacementCost;

  // 3) Time-to-decision improvement (signal KPI, not direct $ unless you price it)
  const ttdGain = Math.max(0, cfg.baselineTtdDays() - inputs.currentTtdDays);

  // Cost side
  const infraCost = employees * cfg.infraPerEmployee();
  // If you log PIP/coaching admin costs, add them here (left out unless you pass them in).

  const valueSaved = valueSavedManager + valueSavedReplacement;
  const totalCost = Math.max(0.01, infraCost);
  const netRoi = (valueSaved - totalCost) / totalCost;

  return {
    employees, recovered, terminated,
    hoursSaved, valueSavedManager, valueSavedReplacement,
    ttdGain, infraCost, valueSaved, netRoi
  };
}

