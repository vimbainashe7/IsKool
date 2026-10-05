"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import type { IsKoolContext } from "./session-contract"
export function ContextSwitcher({ context }: { context: IsKoolContext }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function switchRole(role: IsKoolContext["activeRole"]) {
    if (pending || role === context.activeRole) return
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/context/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!response.ok) throw new Error()
      // Full navigation discards all in-memory context-specific caches.
      window.location.assign(`/${role}/dashboard`)
    } catch {
      setError("Work context could not be changed. Try again.")
      setPending(false)
    }
  }
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={pending}
            aria-label="Switch work context"
            className="h-11 capitalize"
          >
            {pending ? "Switching?" : context.activeRole}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{context.school.name}</DropdownMenuLabel>
          {context.roles.map((role) => (
            <DropdownMenuItem
              key={role}
              onSelect={() => switchRole(role)}
              className="capitalize"
            >
              {role}
              {role === context.activeRole ? " (active)" : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="max-w-44 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
