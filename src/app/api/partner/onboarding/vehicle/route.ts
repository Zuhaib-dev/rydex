import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehcile from "@/models/vehicle.model";
import { NextRequest } from "next/server";
const VEHCILE_REGEX=/^[A-Z]{2}[\\ -]{0, 1}[0-9]{2}[\\ -]{0, 1}[A-Z]{1, 2}[\\ -]{0, 1}[0-9]{4}$/
export async function POST(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "USer unauthorized " }, { status: 400 });
    }
    const user = await User.findOne({email:session.user.email})
    if(!user){
        return Response.json({message:'User not found'})
    }
    const {vehicleType,vehicleModel,vehicleNumber,} = await req.json()
    if(!vehicleModel||!vehicleNumber||!vehicleType){
        return Response.json({message:'All fields are required'})
    }
    if(!VEHCILE_REGEX.test(vehicleNumber)){
        return Response.json({message:'Invalid vehicle number'},{status:400})
    }
    const number = vehicleNumber.toUpperCase()
    const duplicate = await Vehcile.findOne({number:vehicleNumber})
    if(duplicate){
        return Response.json({message:'Vehicle already exists'},{status:400})
    }
    const vehicle  = await Vehcile.findOne({owner:session.user.id})
    if(vehicle){
        vehicle.type = vehicleType,
        vehicle.vehicleModel = vehicleModel,
        vehicle.vehicleNumber = number,
        await vehicle.save()
        return Response.json({message:'Vehicle updated successfully'})
    }
    const vehcile = Vehcile.create({
        owner:session.user.id,
        type:vehicleType,
        vehicleModel,
        vehicleNumber:number,
        status:"pending",
        baseFare:0,
        perKmRate:0,
        waitingCharge:0,
        isActive:true
    })
    if(user.partnerOnboardingSteps<1){
        user.partnerOnboardingSteps=1
    }
    user.role = 'partner'
    await user.save()
    return Response.json({message:'Vehicle added successfully'})
    
  } catch (error) {
    return Response.json({message:'Internal server error'},{status:500})
  }
}
export async function GET(req:NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if(!session||!session.user?.email){
            return Response.json({message:'User unauthorized '},{status:400})
        }
        const user = await User.findOne({email:session.user.email})
        if(!user){
            return Response.json({message:'User not found'})
        }
        const vehicle = await Vehcile.findOne({owner:session.user.id})
        if(!vehicle){
            return Response.json({message:'Vehicle not found'})
        }
        return Response.json({vehicle})
        
    } catch (error) {
        return Response.json({message:'Internal server error'},{status:500})
    }
    
}