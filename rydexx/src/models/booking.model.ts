import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus =
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "arriving"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired"
  | "scheduled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cash"
  | "failed"
  | "pass";

export interface IBooking extends Document {
  user: Types.ObjectId;
  driver: Types.ObjectId;
  vehicle: Types.ObjectId;

  pickupAddress: string;
  dropAddress: string;

  pickupLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  dropLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  fare: number;
  originalFare?: number;
  promoCode?: string;
  discount?: number;
  tripDistanceKm?: number;
  durationMinutes?: number;
  routePolyline?: GeoJSON.LineString;
  pricingSnapshot?: {
    baseFare: number;
    perKmRate: number;
    vehicleType: string;
    vehicleId: string;
    pricingVersion: string;
  };
  quoteId?: Types.ObjectId;
  kashmirAdjusted?: boolean;

  status: BookingStatus;
  paymentStatus: PaymentStatus;

  paymentDeadline?: Date;
  arrivingAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  userMobileNumber: string;
  driverMobileNumber: string;
  adminCommission: number
partnerAmount: number
    pickupOtp: string

  pickupOtpExpires: Date
  dropOtp: string

  dropOtpExpires: Date
  attemptedDrivers: Types.ObjectId[];
  vehicleType: string;
  driverAssignedAt: Date;
  matchRadiusMeters?: number;
  matchRadiusTierIndex?: number;
  sosTriggered: boolean;
  sosTriggeredAt?: Date;
  passengers?: number;
  notes?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "User" },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },

    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    

    fare: { type: Number, required: true },
    originalFare: { type: Number },
    promoCode: { type: String, uppercase: true, trim: true },
    discount: { type: Number, default: 0 },
    tripDistanceKm: { type: Number },
    durationMinutes: { type: Number },
    routePolyline: { type: Schema.Types.Mixed },
    pricingSnapshot: { type: Schema.Types.Mixed },
    quoteId: { type: Schema.Types.ObjectId, ref: "BookingQuote" },
    kashmirAdjusted: { type: Boolean, default: false },

    status: {
      type: String,
      default: "requested",
      index: true,
    },
adminCommission: {
  type: Number,
  default: 0,
},

partnerAmount: {
  type: Number,
  default: 0,
},
    paymentStatus: {
      type: String,
      default: "pending",
    },

    paymentDeadline: Date,
    arrivingAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,

    pickupOtp: {
  type: String,
},

pickupOtpExpires: {
  type: Date,
},
   dropOtp: {
  type: String,
},

dropOtpExpires: {
  type: Date,
},

    userMobileNumber: { 
      type: String, 
      required: true,
      trim: true,
    },

        driverMobileNumber: { 
      type: String, 
      trim: true,
    },
    attemptedDrivers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    vehicleType: {
      type: String,
      enum: ["bike", "car", "truck", "loading", "auto"],
      default: "car",
    },
    driverAssignedAt: {
      type: Date,
      default: Date.now,
    },
    matchRadiusMeters: {
      type: Number,
      default: 5000,
    },
    matchRadiusTierIndex: {
      type: Number,
      default: 0,
    },
    sosTriggered: {
      type: Boolean,
      default: false,
    },
    sosTriggeredAt: {
      type: Date,
    },
    passengers: { type: Number },
    notes: { type: String },
    scheduledAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ user: 1, status: 1, createdAt: -1 });
BookingSchema.index({ driver: 1, status: 1, createdAt: -1 });

const Booking = mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
