import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session-types";

/**
 * JWT sessions do not guarantee a matching `User` row (e.g. DB reset, env switch).
 * Resolves or creates the Prisma user before any FK write (Category.userId, etc.).
 */
export async function ensureDbUser(sessionUser: SessionUser): Promise<SessionUser> {
  const byId = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true },
  });
  if (byId) {
    return { ...sessionUser, id: byId.id };
  }

  if (sessionUser.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: sessionUser.email },
      select: { id: true },
    });
    if (byEmail) {
      return { ...sessionUser, id: byEmail.id };
    }
  }

  const created = await prisma.user.create({
    data: {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      name: sessionUser.name ?? null,
      image: sessionUser.image ?? null,
    },
    select: { id: true },
  });

  return { ...sessionUser, id: created.id };
}
