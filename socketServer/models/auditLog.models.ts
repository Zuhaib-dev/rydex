import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  adminId?: mongoose.Types.ObjectId;
  adminName?: string;
  adminEmail?: string;
  action: string;
  targetId?: mongoose.Types.ObjectId;
  targetModel?: string;
  targetName?: string;
  details?: string;
  severity: "info" | "warning" | "error" | "critical";
  category: "auth" | "admin" | "config" | "api" | "security" | "task" | "db";
  actor: string;
  correlationId?: string;
  createdAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    adminName: String,
    adminEmail: String,
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    targetModel: String,
    targetName: String,
    details: String,
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    category: {
      type: String,
      enum: ["auth", "admin", "config", "api", "security", "task", "db"],
      default: "admin",
    },
    actor: {
      type: String,
      required: true,
      default: "system",
    },
    correlationId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
