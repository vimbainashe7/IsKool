import { WorkspacePage } from "@/features/workspace/workspace-page"
export default async function Page({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  return (
    <WorkspacePage
      title="Member details"
      view="users"
      capability="users.manage"
      resourceId={memberId}
    />
  )
}
