import mongoose, { Schema, Document } from "mongoose";



const UserSchema = new Schema(
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

    socketId:{
      type:String,
      default:null
    },

    currentVehicleType: {
      type: String,
      enum: ["bike", "auto", "car", "loading", "truck"],
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
  },
  { timestamps: true }
);

/* ===== GEO INDEX ===== */
UserSchema.index({ location: "2dsphere" });

const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

export default User;