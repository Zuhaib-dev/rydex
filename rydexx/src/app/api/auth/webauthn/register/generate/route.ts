import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { rpName, getRpID } from "@/lib/webauthn";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rpID = getRpID(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user._id.toString(),
      userName: user.email,
      attestationType: "none",
      excludeCredentials: user.passkeys?.map((key: any) => ({
        id: key.credentialID,
        transports: key.transports,
      })) || [],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Enforces built-in authenticators like Touch ID / Face ID
      },
    });

    user.currentChallenge = options.challenge;
    await user.save();

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("WebAuthn Generate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
