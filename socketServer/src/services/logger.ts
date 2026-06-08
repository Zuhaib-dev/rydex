import mongoose from "mongoose";
import AuditLog from "../../models/auditLog.models.js";

let ioInstance: any = null;

export function setIoForLogging(io: any) {
  ioInstance = io;
}

export async function logSocketEvent(
  action: string,
  details: string,
  severity = "info",
  category = "task",
  actor = "system",
  targetId: string | null = null,
  targetModel: string | null = null
) {
  try {
    const logEntry = new AuditLog({
      action,
      details,
      severity,
      category,
      actor,
      targetId: targetId ? new mongoose.Types.ObjectId(targetId) : null,
      targetModel,
    });
    await logEntry.save();
    if (ioInstance) {
      ioInstance.to("admin-dashboard").emit("live-audit-log", logEntry.toObject());
    }
  } catch (err: any) {
    console.error("Failed to write socket log:", err.message);
  }
}
