import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { parseNextParam } from "@/lib/validation/auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = parseNextParam(next, "/dashboard");

  return (
    <>
      <h1 className="sr-only">Sign in</h1>
      <SignInForm nextPath={nextPath} />
    </>
  );
}
