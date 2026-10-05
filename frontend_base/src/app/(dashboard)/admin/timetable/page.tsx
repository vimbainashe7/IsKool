import { WorkspacePage } from "@/features/workspace/workspace-page"
export default function Page() {
  return (
    <WorkspacePage
      title="School timetable"
      view="timetable"
      capability="timetable.view"
    />
  )
}
