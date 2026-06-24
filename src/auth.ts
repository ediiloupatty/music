import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { queryD1 } from "./lib/cloudflare";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Login",
      credentials: {
        username: { label: "Username or Email", type: "text", placeholder: "johndoe" },
        password: { label: "Password", type: "password", placeholder: "••••••••" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const usernameOrEmail = credentials.username as string;
        const password = credentials.password as string;

        try {
          const users = await queryD1(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            [usernameOrEmail, usernameOrEmail]
          );

          if (!users || users.length === 0) {
            return null;
          }

          const user = users[0];
          const isValid = await bcrypt.compare(password, user.password_hash);

          if (isValid) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
});
