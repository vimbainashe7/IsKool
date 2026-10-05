import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Student records"
      view="students"
      capability="students.manage"
    />
  )
}
