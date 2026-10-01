"use client"

import * as React from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { SidebarNotification } from "@/components/sidebar-notification"
import { appConfig } from "@/config/app"
import type { IsKoolContext } from "@/features/context/session-contract"
import { hasCapability } from "@/lib/permissions/capabilities"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({
  context,
  ...props
}: React.ComponentProps<typeof Sidebar> & { context: IsKoolContext }) {
  const visibleGroups = appConfig.navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) =>
          hasCapability(context.capabilities, item.capability)
        )
        .map((item) => ({
          ...item,
          items: item.items?.filter((subItem) =>
            hasCapability(context.capabilities, subItem.capability)
          ),
        })),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{appConfig.name}</span>
                  <span className="truncate text-xs">{appConfig.description}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNotification />
        <NavUser user={{ name: context.user.name, email: context.school.name, avatar: context.user.avatarUrl ?? "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
