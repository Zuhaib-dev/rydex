import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import connectDb from "./db";
import User from "../models/user.model";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)) {
  throw new Error("CRITICAL SECURITY VULNERABILITY: AUTH_SECRET is either missing or too weak. It must be at least 32 characters long to prevent JWT token forgery.");
} else if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  console.warn("⚠️ WARNING: AUTH_SECRET is weak. Please use a strong 32+ character secret in production.");
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
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

        const user = await User.findOne({ email });

        if (!user) {
          throw new Error("User not found");
        }

        if (user.isPartnerBlocked) {
          throw new Error("Your account has been suspended by the administrator.");
        }

        if (!user.password) {
          throw new Error("Use Google login");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
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

        let dbUser = await User.findOne({ email: user.email });
        if (dbUser && dbUser.isPartnerBlocked) {
          return false; // Reject Google sign-in
        }

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            role: "user",
          });
        } else if (user.image && dbUser.image !== user.image) {
          dbUser.image = user.image;
          await dbUser.save();
        }

        user.id = dbUser._id.toString();
        user.role = dbUser.role;
        user.image = dbUser.image;
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
        token.lastChecked = Date.now();
      } else if (token.email) {
        const now = Date.now();
        const lastChecked = (token.lastChecked as number) || 0;
        const checkInterval = process.env.SESSION_VALIDATION_INTERVAL
          ? parseInt(process.env.SESSION_VALIDATION_INTERVAL, 10)
          : 60 * 1000;

        if (now - lastChecked > checkInterval) {
          await connectDb();
          const dbUser = await User.findOne({ email: token.email })
            .select("_id role isPartnerBlocked")
            .lean();
          if (dbUser) {
            if (dbUser.isPartnerBlocked) {
              token.blocked = true;
            } else {
              token.id = String(dbUser._id);
              token.role = dbUser.role as string;
              token.blocked = false;
            }
          }
          token.lastChecked = now;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.blocked) {
        session.user = null as any;
        return session;
      }
      if (session.user) {
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
