"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentStatusValue =
  "awaiting_payment" | "processing" | "published" | "pending_review" | "disputed" | "refunded";

export function PaymentStatus({
  jobId,
  slug,
  status,
}: {
  jobId: string;
  slug: string;
  status: PaymentStatusValue;
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (status !== "processing" || attempts >= 8) return;
    const timer = window.setTimeout(() => {
      setAttempts((current) => current + 1);
      router.refresh();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [attempts, router, status]);

  const content: Record<PaymentStatusValue, { title: string; description: string }> = {
    awaiting_payment: {
      title: "Ready for payment",
      description: "Choose a package below to start checkout.",
    },
    processing: {
      title: "Payment received, publishing…",
      description:
        "The payment provider is confirming your order. This page will refresh automatically.",
    },
    published: {
      title: "Your job is live",
      description: "Candidates can now find this listing on the public board.",
    },
    pending_review: {
      title: "Payment received",
      description: "Your listing is waiting for board review before it goes live.",
    },
    disputed: {
      title: "Payment needs review",
      description:
        "The received amount did not match the configured package. Contact the board owner before retrying.",
    },
    refunded: {
      title: "Payment refunded",
      description:
        "This listing has been taken offline. You can contact the board owner if this was unexpected.",
    },
  };
  const copy = content[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant={status === "published" ? "default" : "outline"}>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        {status === "published" ? (
          <Button asChild variant="outline">
            <Link href={`/jobs/${slug}`}>View listing</Link>
          </Button>
        ) : null}
        {status === "processing" && attempts >= 8 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAttempts(0);
              router.refresh();
            }}
          >
            Check again
          </Button>
        ) : null}
        {status === "disputed" ? (
          <Button asChild variant="ghost">
            <Link href={`/dashboard/billing?jobId=${encodeURIComponent(jobId)}`}>
              Try another package
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
