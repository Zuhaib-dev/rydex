import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getRpID } from "@/lib/webauthn";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const options = await generateAuthenticationOptions({
      rpID: getRpID(req),
      userVerification: "preferred",
    });

    // Store the challenge in an HTTP-only secure cookie for 5 minutes
    const cookieStore = await cookies();
    cookieStore.set("webauthn_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("WebAuthn Login Generate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
