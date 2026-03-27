import connectDb from "@/lib/db";

export  async function POST(req:Request) {
    try {
        await connectDb()
        
    } catch (error) {
        
    }
    
}