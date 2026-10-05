import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Class attendance"
      view="blocked"
      capability="attendance.manage"
    />
  )
}
