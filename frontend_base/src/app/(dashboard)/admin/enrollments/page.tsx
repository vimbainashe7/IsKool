import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Enrollment"
      view="enrollments"
      capability="enrollments.manage"
    />
  )
}
