"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
}

type ComboboxProps = {
  options: readonly ComboboxOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  groupLabel?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * Select-with-search built on Popover + Command (cmdk). Owned reimplementation
 * of the registry combobox, which pulled in @base-ui/react — replaced to keep
 * the primitive stack Radix-only (ADR 0002).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  groupLabel,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
      >
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-fit justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groupLabel ? (
              <CommandGroup heading={groupLabel}>
                <Options options={options} value={value} onValueChange={onValueChange} onOpenChange={setOpen} />
              </CommandGroup>
            ) : (
              <Options options={options} value={value} onValueChange={onValueChange} onOpenChange={setOpen} />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Options({
  options,
  value,
  onValueChange,
  onOpenChange,
}: {
  options: readonly ComboboxOption[]
  value: string | null
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <>
      {options.map((option) => (
        <CommandItem
          key={option.value}
          value={option.value}
          keywords={[option.label]}
          onSelect={(current) => {
            onValueChange(current)
            onOpenChange(false)
          }}
        >
          <span className="truncate">{option.label}</span>
          <CheckIcon
            className={cn("ml-auto", option.value === value ? "opacity-100" : "opacity-0")}
          />
        </CommandItem>
      ))}
    </>
  )
}
