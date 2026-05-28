import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadValidQuote, quoteToSnapshot } from "@/lib/createBookingQuote";
import { snapshotToClientPayload } from "@/lib/bookingSnapshot";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const quote = await loadValidQuote(id, session.user.id);

  if (!quote) {
    return NextResponse.json(
      { message: "Quote expired or not found" },
      { status: 404 },
    );
  }

  const snapshot = quoteToSnapshot(quote);

  return NextResponse.json({
    success: true,
    quoteId: id,
    snapshot: snapshotToClientPayload(snapshot),
    expiresAt: quote.expiresAt,
  });
}
