import mongoose from "mongoose";
type vehcileType = "bike" | "car" | "truck" | "loading" | "auto";

interface Ivehcile {
  owner: mongoose.Types.ObjectId;
  type: vehcileType;
  vehcileModel:string,
  vehcileNumber:string,
  imageUrl?:string,
  baseFare?:number,
  perKmRate:number,
  waitingCharge:number,
  status:"approved"|"pending"|"rejected",
  rejectionReason:string,
  isActive:boolean,
  createdAt:Date,
  updatedAt:Date
  
}

const vehcileSchema = new mongoose.Schema<Ivehcile>({
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    type:{
        type:String,
        enum:["bike","car","truck","loading","auto"],
        required:true
    },
    vehcileModel:{
        type:String,
        required:true
    },
    vehcileNumber:{
        type:String,
        required:true,
        unique:true
    },
    imageUrl:{
        type:String,
    },
    baseFare:{
        type:Number,
        required:true
    },
    perKmRate:{
        type:Number,
        required:true
    },
    waitingCharge:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:["approved","pending","rejected"],
        default:"pending"
    },
    rejectionReason:{
        type:String,
    },
    isActive:{
        type:Boolean,
        default:true
    }
}, {timestamps:true});
const Vehcile = mongoose.models.vehcile || mongoose.model("vehcile", vehcileSchema);
export default Vehcile;
