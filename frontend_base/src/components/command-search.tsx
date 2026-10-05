"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import { Search, type LucideIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSearch } from "@/features/workspace/use-search"
import { navigationFor } from "@/config/app"
import type { IsKoolContext } from "@/features/context/session-contract"
import { hasCapability } from "@/lib/permissions/capabilities"
import { cn } from "@/lib/utils"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-background text-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      "mb-4 flex h-12 w-full border-b bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[420px] overflow-y-auto overflow-x-hidden pb-2",
      className
    )}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="flex h-12 items-center justify-center text-sm text-muted-foreground"
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&:not(:first-child)]:mt-2",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-12 cursor-pointer select-none items-center gap-2 rounded-lg px-4 text-sm outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

type SearchItem = {
  title: string
  url: string
  group: string
  icon?: LucideIcon
}

type CommandSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: IsKoolContext
}

export function CommandSearch({
  open,
  onOpenChange,
  context,
}: CommandSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const search = useSearch(open ? query : "")

  const searchItems: SearchItem[] = navigationFor(context).flatMap((group) =>
    group.items
      .filter((item) => hasCapability(context.capabilities, item.capability))
      .flatMap((item) => [
        {
          title: item.title,
          url: item.url,
          group: group.label,
          icon: item.icon,
        },
        ...(item.items ?? [])
          .filter((subItem) =>
            hasCapability(context.capabilities, subItem.capability)
          )
          .map((subItem) => ({
            title: subItem.title,
            url: subItem.url,
            group: item.title,
            icon: item.icon,
          })),
      ])
  )

  const groupedItems = searchItems.reduce(
    (acc, item) => {
      acc[item.group] = [...(acc[item.group] ?? []), item]
      return acc
    },
    {} as Record<string, SearchItem[]>
  )

  const handleSelect = (url: string) => {
    router.push(url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-[640px]">
        <DialogTitle className="sr-only">Search IsKool</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, actions and authorized school resources.
        </DialogDescription>
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            aria-label="Search pages and resources"
            placeholder="Search permitted pages and actions…"
            autoFocus
          />
          <CommandList>
            <CommandEmpty>No permitted results found.</CommandEmpty>
            {search.status && (
              <p role="status" className="px-4 py-2 text-sm">
                {search.status}
              </p>
            )}
            {search.results.length > 0 && (
              <CommandGroup heading="School resources">
                {search.results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`${result.group} ${result.title}`}
                    onSelect={() => handleSelect(result.href)}
                  >
                    {result.title}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {result.group}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {Object.entries(groupedItems).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={`${item.group}-${item.url}`}
                      value={`${item.group} ${item.title}`}
                      onSelect={() => handleSelect(item.url)}
                    >
                      {Icon && <Icon className="mr-2 size-4" />}
                      {item.title}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export function SearchTrigger({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="focus-visible:ring-ring inline-flex h-9 w-full items-center justify-start gap-2 rounded-md border bg-background px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 md:w-44 lg:w-64"
    >
      <Search className="size-4" />
      <span className="truncate">Search IsKool</span>
      <kbd className="ml-auto hidden select-none rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-flex">
        Ctrl K
      </kbd>
    </button>
  )
}
