
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { auth } from "@/lib/auth";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({message:"Unauthorized"},{status:401})
        }

        const {userId,socketId}=await req.json()
        if (!socketId || String(userId) !== String(session.user.id)) {
            return NextResponse.json({message:"Forbidden"},{status:403})
        }

        const user=await User.findByIdAndUpdate(userId,{
         socketId,
         isOnline:true
        },{new:true}).select("-password -otp -otpExpiryAt")
        if(!user){
            return NextResponse.json({message:"user not found"},{status:400})
        }
        return NextResponse.json({success:true,user},{status:200})
    } catch {
        return NextResponse.json({success:false},{status:500})
    }
}
