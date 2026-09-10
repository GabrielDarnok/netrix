import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { pool } from "./lib/db";
import { verifyPassword } from "./lib/utils/password";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          const res = await pool.query('SELECT * FROM users WHERE email = $1', [credentials.email]);
          if (res.rows.length === 0) return null;
          
          const user = res.rows[0];
          const isValid = verifyPassword(credentials.password as string, user.password_hash);
          
          if (isValid) {
            return {
              id: user.id.toString(),
              name: user.name,
              email: user.email,
              image: user.name.substring(0, 2).toUpperCase(), // Simulating an avatar with initials
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
        }
        
        return null;
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session?.user?.name) {
        token.name = session.user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
});
