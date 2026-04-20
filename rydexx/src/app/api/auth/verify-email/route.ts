import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function POST(req:Request) {
    
    try {
        
       await connectDb()
       const {email,otp} = await req.json()
       console.log("[verify-email] received:", { email, otp, otpLength: otp?.length })
       if(!email || !otp){
        return Response.json(
            {message:"Please provide email and otp"},
            {status:400}
        )
       }
       const user = await User.findOne({email})
       if(!user){
        return Response.json(
            {message:"User not found"},
            {status:404}
        )
       }
       if(!user.otp){
        return Response.json(
            {message:"OTP not found. Please request a new one."},
            {status:400}
        )
       }
       if(user.otp !== otp){
        return Response.json(
            {message:"Invalid OTP"},
            {status:400}
        )
       }
       if(user.otpExpiryAt < new Date()){
        return Response.json(
            {message:"OTP Expired"},
            {status:400}
        )
       }
       user.isEmailVerified = true
       user.otp = undefined
       user.otpExpiryAt = undefined
       await user.save()
       return Response.json(
        {message:"Email verified successfully"},
        {status:200}
       )

    } catch (error) {
        return Response.json(
            {message:`Internal Server Error ${error}` },
            {status:500}
        )
        
    }
}