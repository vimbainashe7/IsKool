import type { LucideIcon } from "lucide-react"
import { AlertCircle, Ban, FileQuestion, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type StateViewProps = {
  title: string
  description: string
  icon?: LucideIcon
  actionLabel?: string
  actionHref?: string
}

function StateView({
  title,
  description,
  icon: Icon = FileQuestion,
  actionLabel,
  actionHref,
}: StateViewProps) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-iskool-cream text-iskool-blue">
          <Icon className="size-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && actionHref && (
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function EmptyState(props: StateViewProps) {
  return <StateView {...props} />
}

export function ErrorState(props: Omit<StateViewProps, "icon">) {
  return <StateView {...props} icon={AlertCircle} />
}

export function PermissionState(props: Omit<StateViewProps, "icon">) {
  return <StateView {...props} icon={Ban} />
}

export function LoadingState({ title = "Loading", description = "Preparing this workspace." }) {
  return <StateView title={title} description={description} icon={Loader2} />
}
