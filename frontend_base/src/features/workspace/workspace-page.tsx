import { requireSession } from "@/features/context/role-routing"
import { hasCapability, type Capability } from "@/lib/permissions/capabilities"
import { PermissionState, ErrorState } from "@/components/feedback/state-views"
import { PageShell } from "@/components/page-shell"
import { loadWorkspace } from "./server"
import { WorkspaceProvider } from "./workspace-provider"
import { WorkspaceView, type WorkspaceViewKey } from "./workspace-view"
import { StudentDashboard } from "@/features/student-dashboard/student-dashboard"
import { TeacherDashboard } from "@/features/teacher-workspace/teacher-dashboard"
import teacherStyles from "@/features/teacher-workspace/teacher-workspace.module.css"
import { TeacherPageShell } from "@/features/teacher-workspace/teacher-page-shell"
import { TeacherPageContent } from "@/features/teacher-workspace/teacher-page-content"
import { AdminWorkspace } from "@/features/admin-workspace/admin-workspace"
import adminStyles from "@/features/admin-workspace/admin-workspace.module.css"
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
    data = await loadWorkspace(session.context, {
      includeAcademic: view === "dashboard",
    })
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
  if (view === "dashboard" && session.context.activeRole === "student")
    return (
      <div className="mx-auto max-w-[1440px] bg-background px-4 lg:px-6">
        <WorkspaceProvider initial={data} previewIndicator="badge">
          <StudentDashboard studentName={session.context.user.name} />
        </WorkspaceProvider>
      </div>
    )
  if (view === "dashboard" && session.context.activeRole === "teacher")
    return (
      <div
        className={`mx-auto max-w-[1440px] px-4 lg:px-6 ${teacherStyles.canvas}`}
      >
        <WorkspaceProvider initial={data} previewIndicator="badge">
          <TeacherDashboard
            name={session.context.user.name}
            capabilities={session.context.capabilities}
          />
        </WorkspaceProvider>
      </div>
    )
  if (session.context.activeRole === "teacher")
    return (
      <TeacherPageShell title={title} view={view}>
        <WorkspaceProvider initial={data} previewIndicator="badge">
          <TeacherPageContent
            view={view}
            resourceId={resourceId}
            title={title}
          />
        </WorkspaceProvider>
      </TeacherPageShell>
    )
  if (
    session.context.activeRole === "admin" &&
    (view === "dashboard" ||
      [
        "users",
        "students",
        "teachers",
        "roles",
        "admin-classes",
        "enrollments",
        "class",
        "timetable",
        "audit",
        "blocked",
      ].includes(view))
  )
    return (
      <div
        className={`mx-auto max-w-[1440px] px-4 lg:px-6 ${adminStyles.canvas}`}
      >
        <WorkspaceProvider initial={data} previewIndicator="badge">
          <AdminWorkspace
            view={view}
            title={title}
            resourceId={resourceId}
            name={session.context.user.name}
            school={session.context.school.name}
            capabilities={session.context.capabilities}
          />
        </WorkspaceProvider>
      </div>
    )
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
