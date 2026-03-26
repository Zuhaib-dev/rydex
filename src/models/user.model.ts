import mongoose, { Document } from "mongoose";
interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role:"user" | "partner" |"admin"
  isEmailVerified?:boolean
  otp?:string
  otpExpiryAt?:Date
  createdAt: Date;
  updatedAt: Date;
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
      
    }
  },
  { timestamps: true },
);

const User = mongoose.models.User ||  mongoose.model("User", userSchema);
export default User;
