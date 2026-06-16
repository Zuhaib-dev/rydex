import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { getExpectedOrigin, getRpID } from "@/lib/webauthn";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    await connectDb();
    const user = await User.findById(session.user.id);
    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: "User or challenge not found" }, { status: 400 });
    }

    const expectedChallenge = user.currentChallenge;
    const expectedOrigin = getExpectedOrigin(req);
    const expectedRPID = getRpID(req);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      const newPasskey = {
        credentialID,
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: body.response.transports || [],
      };

      if (!user.passkeys) user.passkeys = [];
      user.passkeys.push(newPasskey);
      user.currentChallenge = null;
      await user.save();

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  } catch (error: any) {
    console.error("WebAuthn Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
