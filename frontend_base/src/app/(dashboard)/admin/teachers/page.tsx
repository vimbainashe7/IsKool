import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage title="Teachers" view="teachers" capability="users.manage" />
  )
}
