import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
