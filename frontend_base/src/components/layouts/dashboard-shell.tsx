"use client"

import type * as React from "react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import type { IsKoolContext } from "@/features/context/session-contract"

export function DashboardShell({
  children,
  context,
}: {
  children: React.ReactNode
  context: IsKoolContext
}) {
  return (
    <div
      style={{ "--header-height": "calc(var(--spacing) * 14)" } as React.CSSProperties}
      className="flex min-h-screen flex-col bg-background"
    >
      <SiteHeader context={context} />
      <main className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
