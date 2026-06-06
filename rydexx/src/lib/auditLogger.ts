import connectDb from "./db";
import AuditLog from "@/models/auditLog.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import axios from "axios";

interface LogParams {
  adminEmail: string;
  action: string;
  targetId?: string | mongoose.Types.ObjectId;
  targetModel?: string;
  targetName?: string;
  details?: string;
}

interface SystemLogParams {
  action: string;
  details?: string;
  severity?: "info" | "warning" | "error" | "critical";
  category?: "auth" | "admin" | "config" | "api" | "security" | "task" | "db";
  actor?: string;
  correlationId?: string;
  adminId?: string | mongoose.Types.ObjectId;
  adminName?: string;
  adminEmail?: string;
  targetId?: string | mongoose.Types.ObjectId;
  targetModel?: string;
  targetName?: string;
}

export async function logSystemEvent(params: SystemLogParams) {
  try {
    await connectDb();

    const logEntry = new AuditLog({
      adminId: params.adminId ? new mongoose.Types.ObjectId(String(params.adminId)) : undefined,
      adminName: params.adminName,
      adminEmail: params.adminEmail,
      action: params.action,
      targetId: params.targetId ? new mongoose.Types.ObjectId(String(params.targetId)) : undefined,
      targetModel: params.targetModel,
      targetName: params.targetName,
      details: params.details,
      severity: params.severity || "info",
      category: params.category || "admin",
      actor: params.actor || "system",
      correlationId: params.correlationId || undefined,
    });

    await logEntry.save();

    // Broadcast live to the socket server
    const socketUrl =
      process.env.SOCKET_SERVER_URL ||
      process.env.NEXT_PUBLIC_SOCKET_SERVER ||
      "http://localhost:8000";
    const socketSecret = process.env.SOCKET_INTERNAL_SECRET;

    await axios.post(
      `${socketUrl.replace(/\/+$/, "")}/emit-admin`,
      {
        event: "live-audit-log",
        data: logEntry.toObject(),
      },
      {
        headers: socketSecret ? { "x-socket-secret": socketSecret } : {},
        timeout: 1500,
      }
    ).catch(() => {}); // silently fail to prevent blocking original thread

    return logEntry;
  } catch (error) {
    console.error("Failed to write system audit log:", error);
    return null;
  }
}

export async function logAdminAction({
  adminEmail,
  action,
  targetId,
  targetModel,
  targetName,
  details,
}: LogParams) {
  try {
    await connectDb();

    // Find the admin user
    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.error(`Audit log failed: Admin user with email ${adminEmail} not found`);
      return null;
    }

    return await logSystemEvent({
      adminId: admin._id,
      adminName: admin.name,
      adminEmail: admin.email,
      action,
      targetId,
      targetModel,
      targetName,
      details,
      severity: "info",
      category: "admin",
      actor: admin.email,
    });
  } catch (error) {
    console.error("Failed to write admin audit log wrapper:", error);
    return null;
  }
}
