import mongoose, { Schema, Document } from "mongoose";

export interface Passkey {
  credentialID: string;
  credentialPublicKey: Buffer;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string[];
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "user" | "partner" | "admin";
  fcmTokens?: string[];
  partnerStatus?: "pending" | "approved" | "rejected";
  partnerOnboardingStep: number;
  partnerProfileCompleted: boolean;
  partnerRejectionReason?: string;
  partnerApprovedAt?: Date;
  isPartnerBlocked: boolean;
  videoKycStatus: "not_required" | "pending" | "in_progress" | "approved" | "rejected";
  videoKycRoomId?: string;
  videoKycRejectionReason?: string;
  isPremiumPartner?: boolean;
  lifetimeRides?: number;
  passkeys?: Passkey[];
  currentChallenge?: string;
  isOnline: boolean;
  socketId?: string | null;
  currentVehicleType?: "bike" | "auto" | "car" | "loading" | "truck";
  activeVehicleId?: mongoose.Types.ObjectId | null;
  vehicleLastActivatedAt?: Date | null;
  location?: {
    type: "Point";
    coordinates: number[]; // [lng, lat]
  };
  lastLocationAt?: Date;
  lastLocationUpdate?: Date;
  isPartnerAvailable: boolean;
  isEmailVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  activeSessions?: {
    sessionId: string;
    userAgent: string;
    ipAddress: string;
    lastActive: Date;
    signedInAt: Date;
    fcmToken?: string | null;
  }[];
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "partner", "admin"],
      default: "user",
      index: true,
    },

    fcmTokens: {
      type: [String],
      default: [],
    },

    /* ===== PARTNER ===== */

    partnerStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },

    partnerOnboardingStep: {
      type: Number,
      default: 0,
      min: 0,
      max: 8,
    },

    partnerProfileCompleted: {
      type: Boolean,
      default: false,
    },

    partnerRejectionReason: String,
    partnerApprovedAt: Date,

    isPartnerBlocked: {
      type: Boolean,
      default: false,
    },

    /* ===== VIDEO KYC ===== */

    videoKycStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "in_progress",
        "approved",
        "rejected",
      ],
      default: "not_required",
    },

    videoKycRoomId: String,
    videoKycRejectionReason: String,

    /* ===== DRIVER REALTIME DATA ===== */

    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    socketId: {
      type: String,
      default: null
    },

    currentVehicleType: {
      type: String,
      enum: ["bike", "auto", "car", "loading", "truck"],
    },

    activeVehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    vehicleLastActivatedAt: {
      type: Date,
      default: null,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    lastLocationAt: {
      type: Date,
      index: true,
    },

    lastLocationUpdate: {
      type: Date,
    },

    isPartnerAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* ===== AUTH ===== */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otpExpiresAt: Date,

    passkeys: {
      type: [{
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: Buffer, required: true },
        counter: { type: Number, required: true },
        credentialDeviceType: { type: String, required: true },
        credentialBackedUp: { type: Boolean, required: true },
        transports: { type: [String], default: [] },
      }],
      default: [],
    },
    currentChallenge: {
      type: String,
      default: null,
    },
    activeSessions: {
      type: [{
        sessionId: { type: String, required: true },
        userAgent: { type: String, required: true },
        ipAddress: { type: String, required: true },
        lastActive: { type: Date, required: true },
        signedInAt: { type: Date, required: true },
        fcmToken: { type: String, default: null },
      }],
      default: [],
    }
  },
  { timestamps: true }
);

/* ===== GEO INDEX ===== */
UserSchema.index({ location: "2dsphere" });

const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
