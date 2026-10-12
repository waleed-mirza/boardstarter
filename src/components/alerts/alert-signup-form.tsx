"use client";

import { useState, useTransition } from "react";

import { subscribeToJobAlerts, type AlertActionResult } from "@/lib/actions/alerts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AlertCategoryOption = { id: string; name: string };
export type AlertSignupFormProps = {
  categories?: AlertCategoryOption[];
  initialEmail?: string;
  compact?: boolean;
};

export function AlertSignupForm({
  categories = [],
  initialEmail = "",
  compact = false,
}: AlertSignupFormProps): React.JSX.Element {
  const [email, setEmail] = useState(initialEmail);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<AlertActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCategory(id: string, checked: boolean): void {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      const next = await subscribeToJobAlerts({ email, categories: selected, frequency });
      setResult(next);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="alert-signup-email">Email address</Label>
        <Input
          id="alert-signup-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="min-h-11"
        />
      </div>
      {!compact && categories.length > 0 ? (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">
            Categories <span className="font-normal text-fg-muted">(leave empty for all)</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label key={category.id} className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={selected.includes(category.id)}
                  onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="alert-frequency">Frequency</Label>
        <select
          id="alert-frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as "daily" | "weekly")}
          className="min-h-11 rounded-lg border border-border bg-bg px-3 text-sm focus-ring"
        >
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
      </div>
      <Button type="submit" disabled={pending} className="min-h-11 justify-self-start">
        {pending ? "Sending…" : "Send me job alerts"}
      </Button>
      {result?.ok ? (
        <p role="status" className="text-sm text-success">
          Check your inbox to confirm this alert.
        </p>
      ) : result ? (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      ) : null}
    </form>
  );
}
