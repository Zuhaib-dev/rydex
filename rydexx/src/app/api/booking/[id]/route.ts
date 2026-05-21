import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextResponse, NextRequest } from "next/server";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();
  const booking = await Booking.findById(id).populate("driver vehicle")


  return NextResponse.json(booking);
}