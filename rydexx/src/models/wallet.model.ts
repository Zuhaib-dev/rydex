import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWalletTransaction {
  amount: number;
  type: "credit" | "debit";
  reason: string;
  bookingId?: Types.ObjectId;
  createdAt: Date;
}

export interface IWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  transactions: IWalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<IWalletTransaction>({
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  reason: { type: String, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: false },
  createdAt: { type: Date, default: Date.now },
});

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, default: 0, min: 0 },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", walletSchema);
