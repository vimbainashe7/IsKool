import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import type { IsKoolContext } from "@/features/context/session-contract"
export function DashboardShell({
  children,
  context,
}: {
  children: ReactNode
  context: IsKoolContext
}) {
  return (
    <SidebarProvider>
      <a
        href="#workspace-content"
        className="sr-only z-50 rounded-md bg-background p-3 focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <AppSidebar context={context} collapsible="icon" />
      <SidebarInset className="min-w-0">
        <SiteHeader context={context} />
        <main
          id="workspace-content"
          tabIndex={-1}
          className="flex-1 py-5 md:py-7"
        >
          {children}
        </main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
