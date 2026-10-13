"use client"
import {
  WorkspaceView,
  type WorkspaceViewKey,
} from "@/features/workspace/workspace-view"
import {
  TeacherClasses,
  TeacherClassDetail,
  TeacherAssignments,
  TeacherTimetable,
  TeacherAttendance,
  TeacherNotifications,
  TeacherSearch,
  TeacherToolSummary,
} from "./teacher-pages"
import styles from "./teacher-workspace.module.css"
export function TeacherPageContent({
  view,
  resourceId,
  title,
}: {
  view: WorkspaceViewKey
  resourceId?: string
  title: string
}) {
  if (view === "classes") return <TeacherClasses />
  if (view === "class") return <TeacherClassDetail id={resourceId ?? ""} />
  if (view === "assignments") return <TeacherAssignments />
  if (view === "timetable") return <TeacherTimetable />
  if (view === "notifications") return <TeacherNotifications />
  if (view === "search") return <TeacherSearch />
  if (view === "blocked" && title === "Class attendance")
    return <TeacherAttendance />
  const tool = ["materials", "submissions", "gradebook", "ai"].includes(view)
    ? (view as "materials" | "submissions" | "gradebook" | "ai")
    : null
  return (
    <div className={styles.page}>
      {tool && <TeacherToolSummary kind={tool} />}
      <div className={styles.editor}>
        <WorkspaceView view={view} role="teacher" resourceId={resourceId} />
      </div>
    </div>
  )
}
