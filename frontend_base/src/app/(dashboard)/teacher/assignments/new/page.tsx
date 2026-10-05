import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Create assignment"
      view="new-assignment"
      capability="assignments.manage"
    />
  )
}
