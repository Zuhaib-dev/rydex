import mongoose, { Document } from "mongoose";

export interface Passkey {
  credentialID: string;
  credentialPublicKey: Buffer;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string[];
}

type videoKycStatus="not_required"|"pending" | "in_progress" | "approved" | "rejected"
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role:"user" | "partner" |"admin"
  fcmTokens?: string[];
  isEmailVerified?:boolean
  otp?:string
  otpExpiryAt?:Date
  otpAttempts?:number

  createdAt: Date;
  updatedAt: Date;
  partnerOnboardingSteps:number,
  mobileNumber?:string,
  videoKycStatus:videoKycStatus,
  videoKycRoomId:string,
  videoKycRejectionReason:string
  rejectionReason:string,
  socketId:string|null,
  image?:string|null,
  location?:{
    type:'Point',
    coordinates:[number,number]
  },
  isOnline:boolean,
  isPartnerAvailable?: boolean;
  isPartnerBlocked?: boolean;
  activeVehicleId?: mongoose.Types.ObjectId;
  activeVehicle?: any;
  vehicleLastActivatedAt?: Date;
  lastLocationAt?: Date;
  lastLocationUpdate?: Date;
  currentVehicleType?: string;
  partnerStatus:"pending" | "approved" | "rejected";
  ratingAverage: number;
  ratingCount: number;
  praiseTags: Map<string, number>;
  isPremiumPartner?: boolean;
  lifetimeRides?: number;
  passkeys?: Passkey[];
  currentChallenge?: string;
  sessionVersion?: number;
  activeSessions?: {
    sessionId: string;
    userAgent: string;
    ipAddress: string;
    lastActive: Date;
    signedInAt: Date;
    fcmToken?: string | null;
  }[];
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
    fcmTokens: {
      type: [String],
      default: [],
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
    otpAttempts:{
      type:Number,
      default:0
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
    },
    socketId:{
      type:String,
      default:null
    },
    image:{
      type:String,
      default:null
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: [Number, Number]
    },
    isOnline:{
      type:Boolean,
      default:false,
      index:true
    },
    isPartnerAvailable:{
      type:Boolean,
      default:true,
      index:true,
    },
    isPartnerBlocked:{
      type:Boolean,
      default:false,
      index:true,
    },
    activeVehicleId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Vehicle",
      default:null
    },
    vehicleLastActivatedAt:{
      type:Date,
      default:null
    },
    lastLocationAt:{
      type:Date,
      index:true,
    },
    lastLocationUpdate:{
      type:Date,
      index:true,
    },
    currentVehicleType:{
      type:String,
      enum:["bike","car","truck","loading","auto"],
    },
    ratingAverage: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    praiseTags: {
      type: Map,
      of: Number,
      default: {},
    },
    isPremiumPartner: {
      type: Boolean,
      default: false,
    },
    lifetimeRides: {
      type: Number,
      default: 0,
    },
    passkeys: {
      type: [{
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: Buffer, required: true },
        counter: { type: Number, required: true },
        credentialDeviceType: { type: String, required: true },
        credentialBackedUp: { type: Boolean, required: true },
        transports: { type: [String], default: [] },
      }],
      default: [],
    },
    currentChallenge: {
      type: String,
      default: null,
    },
    sessionVersion: {
      type: Number,
      default: 0,
    },
    activeSessions: {
      type: [{
        sessionId: { type: String, required: true },
        userAgent: { type: String, required: true },
        ipAddress: { type: String, required: true },
        lastActive: { type: Date, required: true },
        signedInAt: { type: Date, required: true },
        fcmToken: { type: String, default: null },
      }],
      default: [],
    }
  },
  { timestamps: true },
);
userSchema.index({location:'2dsphere'})
const User = mongoose.models.User ||  mongoose.model("User", userSchema);
export default User;
