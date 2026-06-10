import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma). Used by middleware and merged in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;

      if (pathname === "/" || pathname === "/login") {
        return true;
      }

      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      if (pathname === "/manifest.webmanifest") {
        return true;
      }

      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
