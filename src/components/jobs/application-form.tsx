"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ApplicationForm({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId,
        name: form.get("name"),
        email: form.get("email"),
        message: form.get("message"),
      }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !payload?.ok) {
      setState("error");
      setMessage(payload?.error ?? "We could not send your application. Please try again.");
      return;
    }
    setState("sent");
    setMessage("Thanks — your application was sent to the hiring team.");
    event.currentTarget.reset();
  }

  if (state === "sent") return <p role="status" className="text-sm text-success">{message}</p>;
  return (
    <form onSubmit={submit} className="mt-5 space-y-4" aria-label="Apply for this job">
      <Input name="name" required maxLength={120} placeholder="Your name" aria-label="Your name" />
      <Input name="email" required type="email" maxLength={320} placeholder="Email address" aria-label="Email address" />
      <Textarea name="message" maxLength={4000} placeholder="Short note (optional)" aria-label="Short note" />
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send application"}
      </Button>
      {message ? <p role="alert" className="text-sm text-danger">{message}</p> : null}
    </form>
  );
}
