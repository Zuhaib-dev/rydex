import mongoose, { Document, Schema } from "mongoose";

export interface ISurgeZone extends Document {
  name: string;
  multiplier: number;
  isActive: boolean;
  area: {
    type: "Polygon";
    coordinates: number[][][]; // GeoJSON Polygon format
  };
  createdAt: Date;
  updatedAt: Date;
}

const surgeZoneSchema = new Schema<ISurgeZone>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1.0,
      default: 1.0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    area: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]], // Array of arrays of arrays of numbers: [ [ [lng, lat], ... ] ]
        required: true,
      },
    },
  },
  { timestamps: true }
);

surgeZoneSchema.index({ area: "2dsphere" });

const SurgeZone = mongoose.models.SurgeZone || mongoose.model("SurgeZone", surgeZoneSchema);
export default SurgeZone;
