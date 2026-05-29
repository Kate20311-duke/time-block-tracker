import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

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

/**
 * Returns the signed-in user or throws. For Server Actions / RSC (Step B+).
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
