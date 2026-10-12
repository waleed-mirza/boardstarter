import type { ReactNode } from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

/**
 * Label, control, description, inline error — always in that order, so error
 * placement never varies (§5.4). All forms use this. `errors` accepts React
 * Hook Form error objects directly: `<FormField errors={[formState.errors.email]}>`.
 */
export function FormField({
  label,
  htmlFor,
  description,
  errors,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  description?: string
  errors?: Array<{ message?: string } | undefined>
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn("gap-2", className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={errors} />
    </Field>
  )
}
