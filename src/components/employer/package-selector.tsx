"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PackageRow } from "@/lib/data/types";

function price(packageRow: PackageRow): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: packageRow.currency,
    minimumFractionDigits: 2,
  }).format(packageRow.price_cents / 100);
}

export function PackageSelector({
  packages,
  value,
  onValueChange,
}: {
  packages: readonly PackageRow[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-label="Listing package"
      className="grid gap-3"
    >
      {packages.map((packageRow) => (
        <label key={packageRow.id} htmlFor={`package-${packageRow.id}`} className="cursor-pointer">
          <Card
            size="sm"
            className={
              value === packageRow.id ? "border-accent ring-1 ring-accent" : "hover:bg-bg-muted"
            }
          >
            <CardContent className="flex items-start gap-3 py-4">
              <RadioGroupItem
                id={`package-${packageRow.id}`}
                value={packageRow.id}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-medium">{packageRow.name}</span>
                  <span className="font-medium tabular">{price(packageRow)}</span>
                </span>
                <span className="mt-1 block text-sm text-fg-muted">
                  {packageRow.duration_days} days
                  {packageRow.is_featured ? " · Featured placement" : " · Standard placement"}
                </span>
              </span>
            </CardContent>
          </Card>
        </label>
      ))}
    </RadioGroup>
  );
}
