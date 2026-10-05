import { WorkspacePage } from "@/features/workspace/workspace-page"
export default async function Page({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  return (
    <WorkspacePage
      title="Assignment details"
      view="assignment"
      capability="assignments.view"
      resourceId={assignmentId}
    />
  )
}
