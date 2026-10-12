"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";

// Rendered only when Google auth is enabled in the Supabase dashboard
// (docs/configuration.md).
const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";

/**
 * Sign-in card (§5.5): email input, one primary button, divider, Google.
 * Magic link only — no password UI in v1.
 */
export function SignInForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState<"link" | "google" | null>(null);

  const { register, handleSubmit, formState } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
  });

  function callbackUrl() {
    const redirect = new URL("/callback", window.location.origin);
    redirect.searchParams.set("next", nextPath);
    return redirect.toString();
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setPending("link");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(null);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  });

  async function signInWithGoogle() {
    setSubmitError(null);
    setPending("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    setPending(null);
    if (error) setSubmitError(error.message);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>We&apos;ll email you a sign-in link — no password needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Email" htmlFor="sign-in-email" errors={[formState.errors.email]}>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={Boolean(formState.errors.email)}
              {...register("email")}
            />
          </FormField>
          {submitError ? (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={formState.isSubmitting || pending !== null}
          >
            {pending === "link" ? "Sending link…" : "Continue with email"}
          </Button>
        </form>
        {googleEnabled ? (
          <>
            <div className="my-4 flex items-center gap-3" role="separator" aria-label="or">
              <Separator className="flex-1" />
              <span className="text-xs text-fg-muted">or</span>
              <Separator className="flex-1" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={signInWithGoogle}
              disabled={pending !== null}
            >
              {pending === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
