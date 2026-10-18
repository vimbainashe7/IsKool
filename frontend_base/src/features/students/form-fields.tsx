"use client"
import { useId, type FormEvent, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
export function Field({
  name,
  label,
  type = "text",
  defaultValue,
  maxLength = 100,
  required = true,
}: {
  name: string
  label: string
  type?: string
  defaultValue?: string
  maxLength?: number
  required?: boolean
}) {
  const fieldId = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        type={type}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
      />
    </div>
  )
}
export function SelectField({
  name,
  label,
  children,
}: {
  name: string
  label: string
  children: ReactNode
}) {
  const fieldId = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId}>{label}</Label>
      <select id={fieldId} name={name} className="iskool-select" required>
        <option value="">Choose {label.toLowerCase()}</option>
        {children}
      </select>
    </div>
  )
}
export function formValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  return Object.fromEntries(new FormData(event.currentTarget)) as Record<
    string,
    string
  >
}
