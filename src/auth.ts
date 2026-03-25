import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import connectDb from "./lib/db";
import User from "./models/user.model";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "johndoe@gmail.com",
        },
        password: {
          type: "password",
          label: "Password",
          placeholder: "*****",
        },
      },
      async authorize(credentials, request) {
        if (!credentials.email || !credentials.password) {
          throw Error("Missing Crediatins");
        }
        const email = credentials.email;
        const password = credentials.password as string;
        await connectDb();
        const user = await User.findOne({ email });
        if (!user) {
          throw Error("User Not Found!");
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw Error("Incorrect Password");
        }
        return {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      ((token.name = user.name),
        (token.id = user.id),
        (token.email = user.email),
        (token.role = user.role));
      return token;
    },
    async session({token,session}){
        if(session.user){
            session.user.name = token.name,
        session.user.id = token.id as string,
        session.user.email = token.email as string,
        session.user.role = token.role as string
        }
        return session


    }
  },
});
