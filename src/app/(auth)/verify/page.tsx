import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Check your inbox",
  robots: { index: false },
};

/** Post-submit state (§5.5): says exactly what happens next. */
export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your inbox</CardTitle>
        <CardDescription>
          {email
            ? `We sent a sign-in link to ${email}. It expires in 1 hour.`
            : "We sent a sign-in link. It expires in 1 hour."}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-fg-muted">
        Open the link on this device to finish signing in. Nothing arrived? Check spam, or
        request a new link from the sign-in page.
      </CardContent>
    </Card>
  );
}
