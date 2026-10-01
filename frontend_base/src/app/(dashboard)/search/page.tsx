import { Search } from "lucide-react"

import { EmptyState } from "@/components/feedback/state-views"
import { PageShell } from "@/components/page-shell"

export default function SearchPage() {
  return (
    <PageShell
      eyebrow="Capability-scoped discovery"
      title="Search IsKool"
      description="Find classes, assignments, students, materials, and school records through server-authorized search."
      icon={Search}
    >
      <EmptyState
        title="Search workspace"
        description="Global search will request capability-scoped results from the server. It must not fetch unrestricted records and filter them in the browser."
      />
    </PageShell>
  )
}
