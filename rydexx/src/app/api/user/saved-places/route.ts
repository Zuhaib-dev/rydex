import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/user.model";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select("savedPlaces");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ savedPlaces: user.savedPlaces || [] }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch saved places error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { label, address, lat, lng } = await req.json();
    
    if (!label || !address || lat === undefined || lng === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Initialize if undefined
    if (!user.savedPlaces) {
      user.savedPlaces = [];
    }

    // Check if label already exists (e.g. "Home") and update it, else push new
    const existingIndex = user.savedPlaces.findIndex((p: any) => p.label.toLowerCase() === label.toLowerCase());
    
    if (existingIndex >= 0) {
      user.savedPlaces[existingIndex] = { label, address, lat, lng };
    } else {
      user.savedPlaces.push({ label, address, lat, lng });
    }

    await user.save();

    return NextResponse.json({ savedPlaces: user.savedPlaces }, { status: 200 });
  } catch (error: any) {
    console.error("Save place error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { label } = await req.json();
    
    if (!label) {
      return NextResponse.json({ message: "Missing label" }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.savedPlaces) {
      user.savedPlaces = user.savedPlaces.filter((p: any) => p.label.toLowerCase() !== label.toLowerCase());
      await user.save();
    }

    return NextResponse.json({ savedPlaces: user.savedPlaces || [] }, { status: 200 });
  } catch (error: any) {
    console.error("Delete place error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
