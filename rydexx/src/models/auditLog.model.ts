import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  action: string;
  targetId?: mongoose.Types.ObjectId;
  targetModel?: string; // e.g. "User" | "Vehicle"
  targetName?: string;
  details?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
