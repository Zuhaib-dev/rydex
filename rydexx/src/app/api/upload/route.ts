import { auth } from "@/lib/auth";
import uploadOnImageKit from "@/lib/imagekit";
import connectDb from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formdata = await req.formData();
    const file = formdata.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
      "image/bmp",
      "image/tiff",
      "application/pdf"
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: "Invalid file type" }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf";
    const maxSize = isPdf ? 10 * 1024 * 1024 : 3 * 1024 * 1024; // 10MB PDF, 3MB image
    if (file.size > maxSize) {
      return NextResponse.json({ message: `File size exceeds limit (${isPdf ? "10MB" : "3MB"})` }, { status: 400 });
    }

    const url = await uploadOnImageKit(file, file.name);
    if (!url) {
      return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("General file upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
