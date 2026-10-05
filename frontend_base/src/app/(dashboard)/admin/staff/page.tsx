import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Staff and HR"
      view="blocked"
      capability="staff.manage"
    />
  )
}
