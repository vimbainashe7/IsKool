import { requireSession } from "@/features/context/role-routing"
import { hasCapability, type Capability } from "@/lib/permissions/capabilities"
import { PermissionState, ErrorState } from "@/components/feedback/state-views"
import { PageShell } from "@/components/page-shell"
import { loadWorkspace } from "./server"
import { WorkspaceProvider } from "./workspace-provider"
import { WorkspaceView, type WorkspaceViewKey } from "./workspace-view"
export async function WorkspacePage({
  title,
  view,
  capability,
  resourceId,
}: {
  title: string
  view: WorkspaceViewKey
  capability: Capability
  resourceId?: string
}) {
  const session = await requireSession()
  if (!hasCapability(session.context.capabilities, capability))
    return (
      <PageShell title="Access unavailable">
        <PermissionState
          title="You do not have access to this workspace"
          description="Choose a permitted workspace from the navigation."
          actionLabel="Open dashboard"
          actionHref="/home"
        />
      </PageShell>
    )
  let data
  try {
    data = await loadWorkspace(session.context)
  } catch {
    return (
      <PageShell title={title}>
        <ErrorState
          title="Your workspace could not be loaded"
          description="Try again shortly. Your work has not been changed."
          actionLabel="Retry"
          actionHref="/home"
        />
      </PageShell>
    )
  }
  return (
    <PageShell title={title} eyebrow={session.context.school.name}>
      <WorkspaceProvider initial={data}>
        <WorkspaceView
          view={view}
          role={session.context.activeRole}
          resourceId={resourceId}
        />
      </WorkspaceProvider>
    </PageShell>
  )
}
