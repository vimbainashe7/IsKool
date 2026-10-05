import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="School settings"
      view="blocked"
      capability="settings.manage"
    />
  )
}
