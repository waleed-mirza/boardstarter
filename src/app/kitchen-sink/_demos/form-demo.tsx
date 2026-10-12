"use client"

import { useState } from "react"

import { FormField } from "@/components/patterns/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Errors = { title?: { message?: string }; email?: { message?: string }; type?: { message?: string } }

export function FormDemo() {
  const [errors, setErrors] = useState<Errors>({})
  // Radix Select 2.3: the trigger label is SelectValue's children.
  const [type, setType] = useState("full-time")

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {}
    const data = new FormData(event.currentTarget)
    if (!String(data.get("title") ?? "").trim()) {
      next.title = { message: "Job title is required." }
    }
    const email = String(data.get("email") ?? "")
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      next.email = { message: "Enter a valid work email." }
    }
    setErrors(next)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-content flex-col gap-6 rounded-lg border border-border p-6"
      noValidate
    >
      <FormField label="Job title" htmlFor="demo-title" errors={[errors.title]}>
        <Input id="demo-title" name="title" placeholder="Senior Frontend Engineer" aria-invalid={Boolean(errors.title)} />
      </FormField>
      <FormField
        label="Contact email"
        htmlFor="demo-email"
        description="Shown to applicants. We never share it."
        errors={[errors.email]}
      >
        <Input id="demo-email" name="email" type="email" placeholder="you@company.com" aria-invalid={Boolean(errors.email)} />
      </FormField>
      <FormField label="Employment type" htmlFor="demo-type" errors={[errors.type]}>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="demo-type" className="w-full">
            <SelectValue placeholder="Select a type">
              {type === "full-time" ? "Full-time" : "Contract"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div className="flex gap-2">
        <Button type="submit">Submit</Button>
        <Button type="button" variant="outline" onClick={() => setErrors({})}>
          Clear errors
        </Button>
      </div>
    </form>
  )
}
