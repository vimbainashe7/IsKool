import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Teacher gradebook"
      view="gradebook"
      capability="grades.manage"
    />
  )
}
