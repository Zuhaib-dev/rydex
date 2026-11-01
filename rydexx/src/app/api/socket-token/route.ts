import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signSocketToken } from "@/lib/socketToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const secret = process.env.SOCKET_INTERNAL_SECRET;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!secret || secret.length < 32) {
    console.error("SOCKET_INTERNAL_SECRET must be configured to sign live socket sessions.");
    return NextResponse.json({ error: "Socket authentication is unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { token: signSocketToken(userId, secret) },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
