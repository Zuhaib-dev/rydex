import mongoose from "mongoose";
type VehicleType = "bike" | "car" | "truck" | "loading" | "auto";

export interface IVehicle {
  owner: mongoose.Types.ObjectId;
  type: VehicleType;
  vehicleModel: string;
  vehicleNumber: string;
  imageUrl?: string;
  baseFare?: number;
  perKmRate: number;
  waitingCharge: number;
  status: "approved" | "pending" | "rejected";
  rejectionReason: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new mongoose.Schema<IVehicle>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["bike", "car", "truck", "loading", "auto"],
      required: true,
    },
    vehicleModel: {
      type: String,
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
    },
    baseFare: {
      type: Number,
      required: true,
    },
    perKmRate: {
      type: Number,
      required: true,
    },
    waitingCharge: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Vehicle = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;
