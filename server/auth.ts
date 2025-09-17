import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "manager" | "hr" | "viewer" };
    }
  }
}

// Super simple demo auth: read from headers for now.
// In production swap for JWT/OAuth.
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const role = (req.header("x-demo-role") as any) || "viewer";
  const uid = req.header("x-demo-user") || "demo@local";
  req.user = { id: uid, role };
  next();
}

export function requireRole(...roles: Array<"manager" | "hr">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as any)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}

export function requireNotDryRun(req: Request, res: Response, next: NextFunction) {
  if (process.env.DRY_RUN === "true") {
    return res.status(409).json({ error: "dry_run_enabled" });
  }
  next();
}

