import connectDb from "./db";
import AuditLog from "@/models/auditLog.model";
import User from "@/models/user.model";
import mongoose from "mongoose";

interface LogParams {
  adminEmail: string;
  action: string;
  targetId?: string | mongoose.Types.ObjectId;
  targetModel?: string;
  targetName?: string;
  details?: string;
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

    const logEntry = new AuditLog({
      adminId: admin._id,
      adminName: admin.name,
      adminEmail: admin.email,
      action,
      targetId: targetId ? new mongoose.Types.ObjectId(String(targetId)) : undefined,
      targetModel,
      targetName,
      details,
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
