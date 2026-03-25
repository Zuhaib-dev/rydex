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
            id:user._id,
            email:user.email,
            name:user.name,
            role:user.role

        }
      },
    }),
  ],
});
