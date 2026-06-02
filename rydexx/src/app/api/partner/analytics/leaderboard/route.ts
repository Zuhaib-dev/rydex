import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/user.model";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch all approved partners
    const partners = await User.find({
      role: "partner",
      partnerStatus: "approved",
    }).select("_id name ratingAverage lifetimeRides isPremiumPartner");

    if (!partners.length) {
      return NextResponse.json({
        success: true,
        data: { leaderboard: [], userRank: null }
      });
    }

    // Calculate scores and sort
    const scoredPartners = partners.map(p => {
      const rides = p.lifetimeRides || 0;
      const rating = p.ratingAverage || 0;
      // Formula: 10 points per ride, 100 points per full star
      const score = (rides * 10) + (rating * 100);
      return {
        id: String(p._id),
        name: p.name,
        rides,
        rating,
        score,
        isPremiumPartner: false // Will calculate below
      };
    });

    scoredPartners.sort((a, b) => b.score - a.score);

    // Determine Top 10% (minimum 1 person gets it if there are drivers)
    const top10PercentCount = Math.max(1, Math.floor(scoredPartners.length * 0.1));
    
    const bulkOps = [];
    
    // Assign ranks and Premium status
    const rankedPartners = scoredPartners.map((p, index) => {
      const isPremium = index < top10PercentCount;
      p.isPremiumPartner = isPremium;
      
      // Prepare bulk update to keep DB in sync for matchmaking
      const originalPartner = partners.find(op => String(op._id) === p.id);
      if (originalPartner && originalPartner.isPremiumPartner !== isPremium) {
        bulkOps.push({
          updateOne: {
            filter: { _id: p.id },
            update: { $set: { isPremiumPartner: isPremium } }
          }
        });
      }
      
      return {
        rank: index + 1,
        ...p
      };
    });

    // Execute bulk updates if statuses changed
    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps as any);
    }

    // Find the current logged in user
    const userId = session.user.id;
    const userStats = rankedPartners.find(p => p.id === userId);

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: rankedPartners.slice(0, 10), // Top 10 for the UI
        userStats: userStats || null,
        totalPartners: rankedPartners.length,
        premiumThresholdRank: top10PercentCount
      }
    });

  } catch (error: any) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
