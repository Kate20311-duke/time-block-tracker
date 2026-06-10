const LOCALHOST_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

export type DemoSeedGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Returns true when DATABASE_URL host looks like local dev. */
export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  const trimmed = databaseUrl.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return LOCALHOST_HOSTS.has(parsed.hostname);
  } catch {
    return (
      trimmed.includes("localhost") ||
      trimmed.includes("127.0.0.1") ||
      trimmed.includes("@db:5432")
    );
  }
}

/**
 * Demo seed may run only against local Postgres unless DEMO_SEED=1 is set.
 * Never run automatically in CI/Vercel build.
 */
export function assertDemoSeedAllowed(options?: {
  databaseUrl?: string;
  demoSeedFlag?: string;
}): DemoSeedGuardResult {
  const databaseUrl = options?.databaseUrl ?? process.env.DATABASE_URL ?? "";
  const demoSeedFlag = options?.demoSeedFlag ?? process.env.DEMO_SEED;

  if (!databaseUrl.trim()) {
    return { ok: false, reason: "DATABASE_URL is not set." };
  }

  if (demoSeedFlag === "1") {
    return { ok: true };
  }

  if (!isLocalDatabaseUrl(databaseUrl)) {
    return {
      ok: false,
      reason:
        "Refusing demo seed: DATABASE_URL is not localhost. Set DEMO_SEED=1 only if you explicitly intend to seed a non-local database.",
    };
  }

  return { ok: true };
}

export const DEMO_SEED_MARKER = "[Demo]";

export function isDemoSeedCategory(description: string | null | undefined): boolean {
  return String(description ?? "").includes(DEMO_SEED_MARKER);
}
