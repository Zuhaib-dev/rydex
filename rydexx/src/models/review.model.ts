import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  booking: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  praiseTags: string[];
  comment?: string;
  role: "user" | "partner"; // role of reviewer
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    praiseTags: { type: [String], default: [] },
    comment: { type: String, trim: true },
    role: { type: String, enum: ["user", "partner"], required: true },
  },
  { timestamps: true }
);

// A reviewer can only review a booking once
ReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });
ReviewSchema.index({ reviewee: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
export default Review;
