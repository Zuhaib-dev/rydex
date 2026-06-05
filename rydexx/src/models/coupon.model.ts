import mongoose, { Document, Schema } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  maxDiscount?: number;
  minBookingAmount?: number;
  expiryDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  usedByUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ["percentage", "flat"],
      default: "flat",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minBookingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    usedByUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema);
export default Coupon;
