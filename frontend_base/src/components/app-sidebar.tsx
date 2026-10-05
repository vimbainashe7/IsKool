"use client"
import type { ComponentProps } from "react"
import Link from "next/link"
import { navigationFor } from "@/config/app"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import type { IsKoolContext } from "@/features/context/session-contract"
export function AppSidebar({
  context,
  ...props
}: ComponentProps<typeof Sidebar> & { context: IsKoolContext }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/home">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  I
                </span>
                <span>
                  <strong>IsKool</strong>
                  <span className="block max-w-44 truncate text-xs">
                    {context.school.name}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigationFor(context).map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings/account">
                <span className="truncate">{context.user.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
