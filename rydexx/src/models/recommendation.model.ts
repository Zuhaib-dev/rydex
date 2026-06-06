import mongoose, { Document, Schema } from "mongoose";

export interface IRecommendation extends Document {
  driver: mongoose.Types.ObjectId;
  currentLocation: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  recommendedLocation: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  recommendedPlaceName: string;
  distanceKm: number;
  multiplier: number;
  status: "pending" | "followed" | "ignored";
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    recommendedLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    recommendedPlaceName: {
      type: String,
      required: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "followed", "ignored"],
      default: "pending",
    },
  },
  { timestamps: true }
);

recommendationSchema.index({ driver: 1 });
recommendationSchema.index({ status: 1 });
recommendationSchema.index({ createdAt: 1 });

const Recommendation =
  mongoose.models.Recommendation ||
  mongoose.model<IRecommendation>("Recommendation", recommendationSchema);

export default Recommendation;
