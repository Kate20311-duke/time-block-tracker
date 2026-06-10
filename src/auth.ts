import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { GitHubProfile } from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      profile(profile: GitHubProfile) {
        const githubId = profile.id ?? profile.sub;
        if (githubId == null) {
          throw new Error("GitHub profile is missing id");
        }
        return {
          id: String(githubId),
          name: profile.name ?? profile.login ?? "GitHub User",
          email: profile.email ?? null,
          image: profile.avatar_url ?? null,
        };
      },
    }),
  ],
});
