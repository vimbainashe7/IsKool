import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Roles and access"
      view="roles"
      capability="roles.manage"
    />
  )
}
