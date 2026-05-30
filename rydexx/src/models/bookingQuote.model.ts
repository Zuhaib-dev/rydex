import mongoose, { Schema, Document, Types } from "mongoose";
import type { PricingSnapshot } from "@/lib/bookingSnapshot";

export interface IBookingQuote extends Document {
  user: Types.ObjectId;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { type: "Point"; coordinates: [number, number] };
  dropLocation: { type: "Point"; coordinates: [number, number] };
  tripDistanceKm: number;
  durationMinutes: number;
  fare: number;
  vehicleType: string;
  vehicleId: Types.ObjectId;
  driverId?: Types.ObjectId;
  routePolyline: GeoJSON.LineString;
  pricingSnapshot: PricingSnapshot;
  kashmirAdjusted?: boolean;
  passengers?: number;
  notes?: string;
  scheduledAt?: Date;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingQuoteSchema = new Schema<IBookingQuote>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },
    pickupLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    dropLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    tripDistanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    fare: { type: Number, required: true },
    vehicleType: { type: String, required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User" },
    routePolyline: { type: Schema.Types.Mixed, required: true },
    pricingSnapshot: { type: Schema.Types.Mixed, required: true },
    kashmirAdjusted: { type: Boolean, default: false },
    passengers: { type: Number },
    notes: { type: String },
    scheduledAt: { type: Date },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

BookingQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BookingQuote =
  mongoose.models.BookingQuote ||
  mongoose.model<IBookingQuote>("BookingQuote", BookingQuoteSchema);

export default BookingQuote;
