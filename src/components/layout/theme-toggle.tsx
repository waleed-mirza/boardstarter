"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { useIsDark } from "@/hooks/use-is-dark";
import { Button } from "@/components/ui/button";

/**
 * Toggles the `.dark` class on <html> and persists the choice to
 * localStorage("theme"). The pre-paint script in src/app/layout.tsx applies
 * it on load — keep the two in sync.
 */
export function ThemeToggle() {
  const dark = useIsDark();

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // storage unavailable (private mode) — theme still applies for this page
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="size-11"
    >
      {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
