import { Bell } from "lucide-react"

import { EmptyState } from "@/components/feedback/state-views"
import { PageShell } from "@/components/page-shell"

export default function NotificationsPage() {
  return (
    <PageShell
      eyebrow="Updates"
      title="Notifications"
      description="School updates, workflow alerts, and action reminders will deep-link only to permitted resources."
      icon={Bell}
    >
      <EmptyState
        title="No notifications yet"
        description="Notifications will deep-link only to resources permitted by the active school and role context."
      />
    </PageShell>
  )
}
