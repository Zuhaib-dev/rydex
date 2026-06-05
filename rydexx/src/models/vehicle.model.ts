import mongoose from "mongoose";
type VehicleType = "bike" | "car" | "truck" | "loading" | "auto";

export interface IVehicle {
  owner: mongoose.Types.ObjectId;
  type: VehicleType;
  brand?: string;
  vehicleModel: string;
  vehicleNumber: string;
  color?: string;
  manufacturingYear?: number;
  fuelType?: "petrol" | "diesel" | "cng" | "electric" | "hybrid";
  seatingCapacity?: number;
  imageUrl?: string;
  baseFare?: number;
  perKmRate: number;
  waitingCharge: number;
  status: "approved" | "pending" | "rejected" | "suspended";
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
      index: true,
    },
    type: {
      type: String,
      enum: ["bike", "car", "truck", "loading", "auto"],
      required: true,
    },
    brand: {
      type: String,
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
    color: {
      type: String,
    },
    manufacturingYear: {
      type: Number,
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "electric", "hybrid"],
    },
    seatingCapacity: {
      type: Number,
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
      enum: ["approved", "pending", "rejected", "suspended"],
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
