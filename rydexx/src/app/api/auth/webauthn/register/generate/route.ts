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
    const url = new URL(req.url);

    // ?replace=true → user is intentionally replacing their existing passkey.
    // Skip excludeCredentials so the browser allows re-registration with the same authenticator.
    // ?check=true → just return passkey count, don't generate options.
    const isCheck = url.searchParams.get("check") === "true";
    const isReplace = url.searchParams.get("replace") === "true";

    if (isCheck) {
      return NextResponse.json({ hasPasskeys: (user.passkeys?.length ?? 0) > 0 });
    }

    // Build excludeCredentials — MUST include type: 'public-key' per the WebAuthn spec
    const excludeCredentials = (!isReplace && user.passkeys && user.passkeys.length > 0)
      ? user.passkeys.map((key: any) => ({
          id: key.credentialID,
          type: "public-key" as const,
          transports: key.transports ?? [],
        }))
      : [];

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
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
