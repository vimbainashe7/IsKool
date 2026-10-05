"use client"
import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/feedback/state-views"
export type RecordItem = {
  id: string
  title: string
  detail?: string
  status?: string
  href?: string
}
export function Records({
  title,
  items,
  empty,
  limit,
}: {
  title: string
  items: RecordItem[]
  empty: string
  limit?: number
}) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(false)
  const filtered = items.filter((item) =>
    `${item.title} ${item.detail ?? ""} ${item.status ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )
  const inputId = `filter-${title.replace(/\W/g, "-")}`
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div>
        <Label htmlFor={inputId}>Search {title.toLowerCase()}</Label>
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to filter"
        />
      </div>
      {filtered.length ? (
        <ul className="grid gap-3">
          {(limit && !expanded && !query
            ? filtered.slice(0, limit)
            : filtered
          ).map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {item.href ? (
                    <Link
                      className="underline underline-offset-4"
                      href={item.href}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </p>
                {item.detail && (
                  <p className="break-words text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                )}
              </div>
              {item.status && (
                <span className="shrink-0 rounded-lg bg-secondary px-3 py-1 text-sm capitalize">
                  {item.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nothing to show yet"
          description={
            query
              ? "No results match. Try another search or clear the filter."
              : empty
          }
        />
      )}
      {limit && filtered.length > limit && !query && (
        <button
          className="min-h-11 rounded-md border px-3 text-sm font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer" : `Show all ${filtered.length}`}
        </button>
      )}
    </section>
  )
}
