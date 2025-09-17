export type PipState =
  | "proposed"
  | "active"
  | "extended"
  | "closed"
  | "offboarding_draft"
  | "terminated"
  | "hold"
  // Compatibility with current schema/code
  | "completed";

// Allow both the proposed model and current code's "completed" usage.
const LEGAL: Record<PipState, PipState[]> = {
  proposed: ["active", "closed"],
  active: ["extended", "closed", "offboarding_draft", "terminated", "completed"],
  extended: ["closed", "offboarding_draft", "terminated", "completed"],
  offboarding_draft: ["terminated", "hold"],
  closed: [],
  terminated: [],
  hold: [],
  completed: [],
};

export function assertTransition(from: PipState, to: PipState) {
  if (!LEGAL[from]?.includes(to)) {
    const err = new Error(`illegal_transition ${from} -> ${to}`);
    (err as any).status = 409;
    throw err;
  }
}

