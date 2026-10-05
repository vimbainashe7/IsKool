import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="User management"
      view="users"
      capability="users.manage"
    />
  )
}
