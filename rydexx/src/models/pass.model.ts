import mongoose, { Schema, Document } from "mongoose";

export interface IPass extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  balance: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PassSchema = new Schema<IPass>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    balance: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

const Pass = mongoose.models.Pass || mongoose.model<IPass>("Pass", PassSchema);

export default Pass;
