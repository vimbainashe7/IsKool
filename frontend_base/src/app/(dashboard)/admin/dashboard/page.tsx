import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Admin dashboard"
      view="dashboard"
      capability="dashboard.admin"
    />
  )
}
