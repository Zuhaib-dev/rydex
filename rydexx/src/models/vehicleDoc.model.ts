import mongoose, { Document } from "mongoose";

export interface IVehicleDoc extends Document {
  vehicleId: mongoose.Types.ObjectId;
  documentType: "rc" | "insurance" | "pollution" | "permit" | "fitness";
  fileUrl: string;
  expiryDate?: Date;
  verificationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleDocSchema = new mongoose.Schema<IVehicleDoc>(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ["rc", "insurance", "pollution", "permit", "fitness"],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const VehicleDoc = mongoose.models.VehicleDoc || mongoose.model("VehicleDoc", vehicleDocSchema);
export default VehicleDoc;
