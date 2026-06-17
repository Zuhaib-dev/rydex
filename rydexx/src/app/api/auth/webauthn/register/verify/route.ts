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

    // body contains the attestation response + optional replace flag
    const body = await req.json();
    const { replace, ...attestation } = body;

    await connectDb();
    const user = await User.findById(session.user.id);
    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: "User or challenge not found" }, { status: 400 });
    }

    const expectedChallenge = user.currentChallenge;
    const expectedOrigin = getExpectedOrigin(req);
    const expectedRPID = getRpID(req);

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // credentialID in v9 is a Uint8Array — convert to base64url string for storage & lookup
      const credentialIDBase64 = Buffer.from(credentialID).toString("base64url");

      const newPasskey = {
        credentialID: credentialIDBase64,
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: attestation.response?.transports ?? [],
      };

      if (replace) {
        // Replace mode: clear all existing passkeys and store only the new one
        user.passkeys = [newPasskey] as any;
      } else {
        // Normal mode: append, but skip exact-same credential to prevent duplicates
        if (!user.passkeys) user.passkeys = [];
        const alreadyExists = user.passkeys.some(
          (pk: any) => pk.credentialID === credentialIDBase64
        );
        if (!alreadyExists) {
          user.passkeys.push(newPasskey);
        }
      }

      user.currentChallenge = null;
      user.markModified("passkeys");
      await user.save();

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  } catch (error: any) {
    console.error("WebAuthn Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
