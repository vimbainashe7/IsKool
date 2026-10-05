import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Grades and feedback"
      view="grades"
      capability="grades.view_own"
    />
  )
}
