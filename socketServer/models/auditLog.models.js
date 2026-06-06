import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
