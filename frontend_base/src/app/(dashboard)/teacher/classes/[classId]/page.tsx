import { WorkspacePage } from "@/features/workspace/workspace-page"
export default async function Page({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  return (
    <WorkspacePage
      title="Class details"
      view="class"
      capability="classes.view"
      resourceId={classId}
    />
  )
}
