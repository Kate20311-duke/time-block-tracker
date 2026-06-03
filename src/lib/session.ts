import { auth } from "@/auth";
import { ensureDbUser } from "@/lib/ensure-db-user";
import type { SessionUser } from "@/lib/session-types";

export type { SessionUser } from "@/lib/session-types";

/** Returns the signed-in user, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    return null;
  }

  return {
    id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

export { ensureDbUser } from "@/lib/ensure-db-user";

/**
 * Returns the signed-in user or throws. For Server Actions / RSC (Step B+).
 * Ensures a `User` row exists for foreign keys (JWT + Prisma adapter).
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return ensureDbUser(user);
}
