import { WorkspacePage } from "@/features/workspace/workspace-page"
export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return (
    <WorkspacePage
      title="Student record"
      view="students"
      capability="students.manage"
      resourceId={studentId}
    />
  )
}
