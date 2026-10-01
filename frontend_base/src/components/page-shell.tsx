import type * as React from "react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PageShellProps = {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("px-4 lg:px-6", className)}>
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section className="iskool-dark-panel relative overflow-hidden rounded-[26px] border p-6 md:p-8">
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              {eyebrow && (
                <Badge className="w-fit border-iskool-cream/20 bg-iskool-cream/12 text-iskool-cream hover:bg-iskool-cream/12">
                  {eyebrow}
                </Badge>
              )}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                {description && (
                  <p className="max-w-3xl text-sm leading-6 text-iskool-cream/78 md:text-base">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="relative z-10 shrink-0">{action}</div>}
          </div>
          {Icon && (
            <div className="absolute right-6 top-6 hidden size-28 rotate-[-8deg] items-center justify-center rounded-[28px] bg-iskool-cream/12 text-iskool-cream md:flex">
              <Icon className="size-14" />
            </div>
          )}
          <div className="absolute -bottom-16 -right-12 size-44 rounded-full bg-iskool-cream/10" />
        </section>
        {children}
      </div>
    </div>
  )
}
