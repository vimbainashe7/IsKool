import { GraduationCap } from "lucide-react"

import type { IsKoolContext } from "@/features/context/session-contract"
import { cn } from "@/lib/utils"

type SchoolLogoProps = {
  school: IsKoolContext["school"]
  className?: string
  markClassName?: string
  showName?: boolean
  subtitle?: string
  inverse?: boolean
}

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "")
}

export function SchoolLogo({
  school,
  className,
  markClassName,
  showName = true,
  subtitle,
  inverse = false,
}: SchoolLogoProps) {
  const label = `${school.name} logo`
  const brandColor = school.brandColor || "#04093d"

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border text-sm font-bold shadow-sm",
          inverse
            ? "border-iskool-cream/20 bg-iskool-cream text-iskool-navy"
            : "border-iskool-cream bg-white text-iskool-navy",
          markClassName
        )}
        aria-label={label}
        role="img"
        style={school.logoUrl ? undefined : { backgroundColor: brandColor, color: "#fff5d4" }}
      >
        {school.logoUrl ? (
          <span
            className="block size-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${school.logoUrl}")` }}
          />
        ) : school.name ? (
          <span>{initials(school.name).toUpperCase()}</span>
        ) : (
          <GraduationCap className="size-5" />
        )}
      </div>
      {showName && (
        <span className="min-w-0 leading-tight">
          <span className={cn("block truncate text-sm font-bold", inverse ? "text-iskool-cream" : "text-iskool-navy dark:text-foreground")}>
            {school.name}
          </span>
          {subtitle && (
            <span className={cn("block truncate text-xs", inverse ? "text-iskool-cream/60" : "text-muted-foreground")}>
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
