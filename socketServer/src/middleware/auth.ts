import { Request, Response, NextFunction } from "express";

export function requireSocketSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SOCKET_INTERNAL_SECRET;
  if (!secret) {
    console.error("[socket] SOCKET_INTERNAL_SECRET is not configured in the environment! Access denied.");
    res.status(500).json({ success: false, message: "Server misconfigured" });
    return;
  }

  if (req.get("x-socket-secret") !== secret) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  next();
}
