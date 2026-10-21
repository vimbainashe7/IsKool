"use client"
import { useLayoutEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, UserCircle } from "lucide-react"
import { SchoolLogo } from "@/components/school-logo"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ContextSwitcher } from "@/features/context/context-switcher"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import type { IsKoolContext } from "@/features/context/session-contract"
const subscribe = () => () => {}
const clientReady = () => true
const serverReady = () => false
export function SiteHeader({ context }: { context: IsKoolContext }) {
  const [open, setOpen] = useState(false)
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady)
  const pathname = usePathname()
  const assignmentLabel = /^\/(teacher|student)\/assignments\//.test(pathname)
    ? pathname.endsWith("/new")
      ? "Create assignment"
      : "Assignment details"
    : null
  useLayoutEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((old) => !old)
      }
    }
    document.addEventListener("keydown", key)
    return () => document.removeEventListener("keydown", key)
  }, [])
  return (
    <>
      <header className="border-b bg-background px-3 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <SidebarTrigger className="size-11" />
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <SchoolLogo
              school={context.school}
              showName={false}
              markClassName="size-8"
            />
            <div>
              <p className="max-w-44 truncate text-sm font-semibold">
                {context.school.name}
              </p>
              <nav
                aria-label="Breadcrumb"
                className="text-xs text-muted-foreground"
              >
                <Link href="/home">Home</Link>
                <span aria-hidden="true"> / </span>
                <span className="capitalize">
                  {pathname.startsWith("/admin/students/")
                    ? "Student record"
                    : (assignmentLabel ??
                      pathname
                        .split("/")
                        .filter(Boolean)
                        .slice(-1)[0]
                        ?.replace(/-/g, " "))}
                </span>
              </nav>
            </div>
          </div>
          <ContextSwitcher context={context} />
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/notifications" aria-label="Notifications">
              <Bell />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Profile menu"
              >
                <UserCircle />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{context.user.name}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/settings/account">Account settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">Help</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action="/logout" method="post">
                <button
                  className="w-full rounded-md px-2 py-3 text-left text-sm hover:bg-accent"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden sm:block">
            <ModeToggle />
          </div>
          <div className="w-full sm:w-auto">
            <SearchTrigger disabled={!ready} onClick={() => setOpen(true)} />
          </div>
        </div>
      </header>
      <CommandSearch open={open} onOpenChange={setOpen} context={context} />
    </>
  )
}
