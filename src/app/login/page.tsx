import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGitHub } from "@/lib/actions/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const githubConfigured =
    Boolean(process.env.AUTH_GITHUB_ID) &&
    Boolean(process.env.AUTH_GITHUB_SECRET);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.loginTitle}</h1>
        <p className="mt-2 text-zinc-600">{t.auth.loginSubtitle}</p>
      </section>

      {githubConfigured ? (
        <form action={signInWithGitHub}>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t.auth.signInWithGitHub}
          </button>
        </form>
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.auth.setupHint}
        </p>
      )}

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="font-medium text-zinc-700 hover:text-zinc-900">
          {t.auth.backHome}
        </Link>
      </p>
    </div>
  );
}
