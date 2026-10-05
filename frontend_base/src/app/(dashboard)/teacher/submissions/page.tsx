import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="Review submissions"
      view="submissions"
      capability="submissions.review"
    />
  )
}
