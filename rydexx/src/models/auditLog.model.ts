import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  adminId?: mongoose.Types.ObjectId;
  adminName?: string;
  adminEmail?: string;
  action: string;
  targetId?: mongoose.Types.ObjectId;
  targetModel?: string; // e.g. "User" | "Vehicle"
  targetName?: string;
  details?: string;
  severity: "info" | "warning" | "error" | "critical";
  category: "auth" | "admin" | "config" | "api" | "security" | "task" | "db";
  actor: string;
  correlationId?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    adminName: {
      type: String,
      required: false,
    },
    adminEmail: {
      type: String,
      required: false,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    targetModel: {
      type: String,
    },
    targetName: {
      type: String,
    },
    details: {
      type: String,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
      index: true,
    },
    category: {
      type: String,
      enum: ["auth", "admin", "config", "api", "security", "task", "db"],
      default: "admin",
      index: true,
    },
    actor: {
      type: String,
      required: true,
      default: "system",
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
