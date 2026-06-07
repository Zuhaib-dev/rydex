import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Review from "@/models/review.model";

export const dynamic = "force-dynamic";

/**
 * GET /api/reviews?bookingId=xxx
 * Returns whether the current user has already reviewed this booking.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const bookingId = req.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return NextResponse.json({ message: "bookingId is required" }, { status: 400 });
    }

    const review = await Review.findOne({
      booking: bookingId,
      reviewer: session.user.id,
    }).lean();

    return NextResponse.json({ hasReviewed: !!review, review: review ?? null });
  } catch (error: any) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    // 1. Authenticate user
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await req.json();
    const { bookingId, rating, praiseTags = [], comment = "" } = body;

    // Validate inputs
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ message: "Rating must be a number between 1 and 5" }, { status: 400 });
    }

    // 3. Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Check status
    if (booking.status !== "completed") {
      return NextResponse.json({ message: "Cannot rate an incomplete trip" }, { status: 400 });
    }

    // 4. Verify participant role and determine reviewee
    let reviewerRole: "user" | "partner";
    let revieweeId: string;

    const isUser = booking.user.toString() === userId;
    const isDriver = booking.driver.toString() === userId;

    if (isUser) {
      reviewerRole = "user";
      revieweeId = booking.driver.toString();
    } else if (isDriver) {
      reviewerRole = "partner";
      revieweeId = booking.user.toString();
    } else {
      return NextResponse.json({ message: "You are not a participant in this booking" }, { status: 403 });
    }

    // 5. Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId, reviewer: userId });
    if (existingReview) {
      return NextResponse.json({ message: "You have already reviewed this trip" }, { status: 400 });
    }

    // 6. Create Review
    const review = await Review.create({
      booking: bookingId,
      reviewer: userId,
      reviewee: revieweeId,
      rating: parsedRating,
      praiseTags,
      comment,
      role: reviewerRole,
    });

    // 7. Update Reviewee Rating stats
    const reviewee = await User.findById(revieweeId);
    if (reviewee) {
      const oldCount = reviewee.ratingCount || 0;
      const oldAvg = reviewee.ratingAverage || 0;
      const newCount = oldCount + 1;
      const newAvg = ((oldAvg * oldCount) + parsedRating) / newCount;

      reviewee.ratingCount = newCount;
      reviewee.ratingAverage = Number(newAvg.toFixed(2));

      // Update Mongoose Map for praise tags
      if (!reviewee.praiseTags) {
        reviewee.praiseTags = new Map();
      }
      
      praiseTags.forEach((tag: string) => {
        const currentCount = reviewee.praiseTags.get(tag) || 0;
        reviewee.praiseTags.set(tag, currentCount + 1);
      });

      await reviewee.save();
    }

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

