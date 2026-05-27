import mongoose, { Document, Schema } from "mongoose";

export interface ISearchLog extends Document {
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
}

const searchLogSchema = new Schema<ISearchLog>(
  {
    location: {
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

searchLogSchema.index({ location: "2dsphere" });
// Optional: Automatically delete logs older than 7 days to save space
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const SearchLog = mongoose.models.SearchLog || mongoose.model("SearchLog", searchLogSchema);
export default SearchLog;
