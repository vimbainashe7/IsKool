"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"

import type { IsKoolContext } from "@/features/context/session-contract"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const roleLabels: Record<IsKoolContext["activeRole"], string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
}

const roleDashboards: Record<IsKoolContext["activeRole"], string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
}

export function ContextSwitcher({ context }: { context: IsKoolContext }) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = React.useState(context.activeRole)

  async function switchRole(role: IsKoolContext["activeRole"]) {
    setSelectedRole(role)
    await fetch("/api/context/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    })
    router.push(roleDashboards[role])
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <span className="hidden text-left sm:block">{context.school.name}</span>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {roleLabels[selectedRole]}
          </Badge>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p>{context.school.name}</p>
            <p className="text-xs font-normal text-muted-foreground">
              Active role controls workspace navigation. Database RLS still authorizes data.
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {context.roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            className="cursor-pointer"
          >
            <span>{roleLabels[role]}</span>
            {selectedRole === role && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
