import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Teaching materials"
      view="materials"
      capability="materials.manage"
    />
  )
}
