import mongoose, { Document } from "mongoose";
type videoKycStatus="not_required"|"pending" | "in_progress" | "approved" | "rejected"
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role:"user" | "partner" |"admin"
  isEmailVerified?:boolean
  otp?:string
  otpExpiryAt?:Date
  createdAt: Date;
  updatedAt: Date;
  partnerOnboardingSteps:number,
  mobileNumber?:string,
  videoKycStatus:videoKycStatus,
  videoKycRoomId:string,
  videoKycRejectionReason:string
  rejectionReason:string,
  partnerStatus:"pending" | "approved" | "rejected"
}
const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    role:{
      type:String,
      default:"user",
      enum:['user','partner','admin']
    },
    isEmailVerified:{
      type:Boolean,
      default:false
    },
    otp:{
      type:String,
      
    },
    otpExpiryAt:{
      type:Date,
      
    },
    partnerOnboardingSteps:{
      type:Number,
      min:0,
      max:8,
      default:0
    },
    mobileNumber:{
      type:String,
    },
    partnerStatus:{
      type:String,
      default:"pending",
      enum:['pending','approved','rejected']
    },
    rejectionReason:{
      type:String
    },
    videoKycStatus:{
      type:String,
      default:"not_required",
      enum:["not_required","pending","in_progress","approved","rejected"]
    },
    videoKycRoomId:{
      type:String,
    },
    videoKycRejectionReason:{
      type:String
    }
  },
  { timestamps: true },
);

const User = mongoose.models.User ||  mongoose.model("User", userSchema);
export default User;
