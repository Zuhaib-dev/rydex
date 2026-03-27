import mongoose from "mongoose";

interface IpartnerBank {
  owner: mongoose.Types.ObjectId;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upi?:string
  accountHolderName: string;
  status: "not_added" | "added" | "verified";
  createdAt: Date;
  updatedAt: Date;
}

const partnerBankSchema = new mongoose.Schema<IpartnerBank>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique:true
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase:true
    },
    bankName: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["not_added", "added", "verified"],
      default: "not_added",
    },
  },
  { timestamps: true },
);
const PartnerBank =
  mongoose.models.PartnerBank || mongoose.model("PartnerBank", partnerBankSchema);
export default PartnerBank;
