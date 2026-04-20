import mongoose from "mongoose";

interface IpartnerDocs {
  owner: mongoose.Types.ObjectId;
  aadharUrl: string;
  rcUrl: string;
  licenseUrl: string;
  status: "approved" | "pending" | "rejected";
  rejectionReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const partnerDocsSchema = new mongoose.Schema<IpartnerDocs>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aadharUrl: {
      type: String,
      required: true,
    },
    rcUrl: {
      type: String,
      required: true,
    },
    licenseUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true },
);
const PartnerDocs =
  mongoose.models.PartnerDocs || mongoose.model("PartnerDocs", partnerDocsSchema);
export default PartnerDocs;
