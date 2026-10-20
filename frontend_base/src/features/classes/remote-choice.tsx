"use client"
import { useEffect, useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { studentRequest } from "@/features/students/contracts"
import { accountOptionsSchema, classOptionsSchema } from "./admin-contracts"
type Choice = { id: string; label: string }
async function choices(
  kind: "student" | "teacher" | "class",
  search: string,
  cursor: string | undefined,
  signal: AbortSignal
) {
  const query = new URLSearchParams({ limit: "25", search })
  if (cursor) query.set("cursor", cursor)
  if (kind === "class") {
    const page = await studentRequest(
      `student-administration/classes?${query}`,
      classOptionsSchema,
      "GET",
      undefined,
      signal
    )
    return {
      ...page,
      items: page.items.map((item) => ({
        id: item.id,
        label: `${item.name} | ${item.academicYearLabel}`,
      })),
    }
  }
  query.set("role", kind)
  const page = await studentRequest(
    `student-administration/accounts?${query}`,
    accountOptionsSchema,
    "GET",
    undefined,
    signal
  )
  return {
    ...page,
    items: page.items.map((item) => ({
      id: item.id,
      label: `${item.displayName} | ${item.email}`,
    })),
  }
}
export function RemoteChoice({
  kind,
  label,
  value,
  onChange,
  current,
  disabled = false,
}: {
  kind: "student" | "teacher" | "class"
  label: string
  value: string
  onChange: (id: string) => void
  current?: Choice
  disabled?: boolean
}) {
  const fieldId = useId(),
    searchId = useId()
  const [search, setSearch] = useState(""),
    [page, setPage] = useState<{
      items: Choice[]
      nextCursor: string | null
    } | null>(null)
  const [cursor, setCursor] = useState<string>(),
    [retry, setRetry] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Choice>()
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      choices(kind, search, cursor, controller.signal)
        .then((result) => {
          if (active) {
            setPage(result)
            setError("")
          }
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error ? e.message : "Choices could not be loaded."
            )
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [kind, search, cursor, retry])
  const preserved =
    page?.items.find((item) => item.id === value) ??
    (selected?.id === value ? selected : undefined) ??
    (current?.id === value ? current : undefined)
  return (
    <div className="grid max-w-2xl gap-3">
      <Label htmlFor={searchId}>Find {label.toLowerCase()}</Label>
      <Input
        id={searchId}
        value={search}
        disabled={disabled}
        maxLength={100}
        placeholder={
          kind === "class" ? "Search class name" : "Search by name or email"
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault()
        }}
        onChange={(event) => {
          setSearch(event.target.value)
          setCursor(undefined)
        }}
      />
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        className="iskool-select"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const id = event.target.value
          setSelected(page?.items.find((item) => item.id === id) ?? preserved)
          onChange(id)
        }}
      >
        <option value="">
          {kind === "student" ? "Not linked" : `Choose ${label.toLowerCase()}`}
        </option>
        {value && !page?.items.some((item) => item.id === value) && (
          <option value={value}>
            {preserved?.label ?? "Current selection"}
          </option>
        )}
        {page?.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {loading && <p role="status">Loading choices...</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetry((v) => v + 1)}
          >
            Retry choices
          </Button>
        </p>
      )}
      {!loading && !error && page?.items.length === 0 && (
        <p>
          {kind === "class"
            ? "No matching classes."
            : "No matching active accounts."}
        </p>
      )}
      {page?.nextCursor && (
        <Button
          type="button"
          variant="outline"
          disabled={loading || disabled}
          onClick={() => setCursor(page.nextCursor ?? undefined)}
        >
          More choices
        </Button>
      )}
      {cursor && (
        <Button
          type="button"
          variant="outline"
          disabled={loading || disabled}
          onClick={() => setCursor(undefined)}
        >
          First choices
        </Button>
      )}
    </div>
  )
}
