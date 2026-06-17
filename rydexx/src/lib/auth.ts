import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import connectDb from "./db";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";
import { getExpectedOrigin, getRpID } from "./webauthn";
import { UAParser } from "ua-parser-js";

if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)) {
  throw new Error("CRITICAL SECURITY VULNERABILITY: AUTH_SECRET is either missing or too weak. It must be at least 32 characters long to prevent JWT token forgery.");
} else if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  console.warn("⚠️ WARNING: AUTH_SECRET is weak. Please use a strong 32+ character secret in production.");
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        response: { label: "Response", type: "text" },
      },
      async authorize(credentials, req) {
        const responseRaw = credentials?.response as string;
        if (!responseRaw) throw new Error("Missing WebAuthn response");
        
        let response;
        try {
          response = JSON.parse(responseRaw);
        } catch {
          throw new Error("Invalid WebAuthn response format");
        }

        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get("webauthn_challenge")?.value;
        if (!expectedChallenge) throw new Error("Authentication challenge expired or missing");

        await connectDb();
        let user;
        let sessionVersion = Date.now();
        try {
          // response.id from the browser is a base64url string; DB stores credentialID as base64url
          user = await User.findOne({ "passkeys.credentialID": response.id });
          
          if (!user || user.isPartnerBlocked) {
            throw new Error("User not found or blocked");
          }

          const passkey = user.passkeys?.find((pk: any) => pk.credentialID === response.id);
          if (!passkey) {
            throw new Error("Passkey not registered for this user");
          }

          // credentialPublicKey is stored as Buffer in Mongo — convert to Uint8Array for verification
          const publicKeyBytes = new Uint8Array(
            Buffer.isBuffer(passkey.credentialPublicKey)
              ? passkey.credentialPublicKey
              : Buffer.from(passkey.credentialPublicKey)
          );

          // v9: authenticator.credentialID must be Uint8Array — decode from base64url string stored in DB
          const credentialIDBytes = new Uint8Array(Buffer.from(passkey.credentialID, "base64url"));

          const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: getExpectedOrigin(),
            expectedRPID: getRpID(),
            authenticator: {
              credentialID: credentialIDBytes,
              credentialPublicKey: publicKeyBytes,
              counter: passkey.counter,
              transports: passkey.transports,
            },
          });

          if (!verification.verified) {
            throw new Error("Passkey signature verification failed");
          }

          // Update counter to prevent replay attacks
          passkey.counter = verification.authenticationInfo.newCounter;
          // Update session version for single active session
          user.sessionVersion = sessionVersion;
          // markModified so Mongoose detects the change in the subdocument array
          user.markModified("passkeys");
          await user.save();
          
          // Clean up challenge cookie
          cookieStore.delete("webauthn_challenge");
        } catch (error) {
          console.error("Passkey Auth Verification Error:", error);
          throw error;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          sessionVersion,
        };
      }
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          throw new Error("Missing credentials");
        }

        await connectDb();

        // Select only fields needed — avoids loading passkeys[], fcmTokens[], etc.
        const user = await User.findOne({ email })
          .select("_id email name role image password isPartnerBlocked");

        if (!user) {
          throw new Error("User not found");
        }

        if (user.isPartnerBlocked) {
          throw new Error("Your account has been suspended by the administrator.");
        }

        if (!user.password) {
          throw new Error("This account uses Google sign-in. Please use the Google button.");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          throw new Error("Invalid password");
        }

        const sessionVersion = Date.now();
        await User.updateOne({ _id: user._id }, { $set: { sessionVersion } });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          sessionVersion,
        };
      },
    }),

    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        const sessionVersion = Date.now();

        // Use findOneAndUpdate with upsert — one round-trip instead of findOne + create/save
        const dbUser = await User.findOneAndUpdate(
          { email: user.email },
          {
            $setOnInsert: {
              name: user.name,
              email: user.email,
              image: user.image,
              role: "user",
            },
            $set: {
              sessionVersion
            }
          },
          {
            upsert: true,
            new: true,
            // Only fetch the fields we actually need
            projection: { _id: 1, role: 1, image: 1, isPartnerBlocked: 1 },
            lean: true,
          }
        );

        if (!dbUser) return false;
        if (dbUser.isPartnerBlocked) return false;

        // If Google gave a new avatar and it's different, update in background (non-blocking)
        if (user.image && dbUser.image !== user.image) {
          User.updateOne({ _id: dbUser._id }, { $set: { image: user.image } }).exec().catch(() => {});
        }

        user.id = (dbUser._id as any).toString();
        user.role = dbUser.role;
        user.image = dbUser.image ?? user.image;
        (user as any).sessionVersion = sessionVersion;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.picture = user.image;
        token.sessionVersion = (user as any).sessionVersion;
        
        let rawUserAgent = "Unknown Device";
        let ipAddress = "Unknown";
        
        try {
          const headersList = await headers();
          rawUserAgent = headersList.get("user-agent") || "Unknown Device";
          ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "Unknown";
        } catch (e) {}

        const parser = new UAParser(rawUserAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        
        let friendlyUserAgent = "Unknown Device";
        if (browser.name) {
          friendlyUserAgent = `${browser.name} on ${os.name || "Unknown OS"}`;
          if (device.type === "mobile" || device.type === "tablet") {
            friendlyUserAgent += ` (${device.vendor || ""} ${device.model || "Mobile"})`;
          }
        }

        // Since we are inside auth callback, we can't always guarantee headers() is available outside edge.
        // We'll generate a random sessionId.
        const sessionId = crypto.randomUUID();
        token.sessionId = sessionId;

        await connectDb();
        await User.updateOne(
          { _id: user.id },
          {
            $push: {
              activeSessions: {
                sessionId,
                userAgent: friendlyUserAgent,
                ipAddress,
                lastActive: new Date(),
                signedInAt: new Date(),
              }
            }
          }
        );

        token.lastChecked = Date.now();
      } else if (token.email) {
        const now = Date.now();
        const lastChecked = (token.lastChecked as number) || 0;
        const checkInterval = process.env.SESSION_VALIDATION_INTERVAL
          ? parseInt(process.env.SESSION_VALIDATION_INTERVAL, 10)
          : 5 * 60 * 1000; // Default: revalidate role from DB every 5 minutes

        if (now - lastChecked > checkInterval) {
          await connectDb();
          const dbUser = await User.findOne({ email: token.email })
            .select("_id role isPartnerBlocked sessionVersion activeSessions")
            .lean();
          if (dbUser) {
            // Check if user is suspended
            if (dbUser.isPartnerBlocked) {
              token.blocked = true;
            } else {
              // Check if the current sessionId is still in the activeSessions array
              const sessionExists = dbUser.activeSessions?.some(
                (s: any) => s.sessionId === token.sessionId
              );

              if (!sessionExists) {
                // The session was revoked from the UI
                token.blocked = true;
              } else {
                token.id = String(dbUser._id);
                token.role = dbUser.role as string;
                token.sessionVersion = dbUser.sessionVersion;
                token.blocked = false;

                // Optionally update lastActive timestamp in background
                User.updateOne(
                  { _id: dbUser._id, "activeSessions.sessionId": token.sessionId },
                  { $set: { "activeSessions.$.lastActive": new Date() } }
                ).exec().catch(() => {});
              }
            }
          }
          token.lastChecked = now;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.blocked) {
        (session as any).error = "SessionBlocked";
        // Do NOT set session.user = null, as it breaks frontend types and causes default avatars to show
      } else if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = token.picture as string | null;
      }

      return session;
    },
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  session: {
    strategy: "jwt" as const,
    maxAge: 10 * 24 * 60 * 60,
  },

  secret: process.env.AUTH_SECRET,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
