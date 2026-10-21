import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { WorkspaceViewKey } from "@/features/workspace/workspace-view"
import { TeacherPageHeader } from "./teacher-components"
import styles from "./teacher-workspace.module.css"
const descriptions: Partial<Record<WorkspaceViewKey, string>> = {
  classes: "Your assigned classes, learners and upcoming teaching work.",
  class: "Class resources, assignments, learners and the teaching schedule.",
  assignments:
    "Create, organize and review coursework for your assigned classes.",
  "new-assignment":
    "Choose a class and term, write the instructions and deadline, then save a draft before publishing.",
  assignment: "Review and update assignment details for your class.",
  materials:
    "Upload, organize and publish learning resources for your classes.",
  submissions:
    "Review student work, save feedback and release confirmed grades.",
  gradebook: "Choose a class and assessment, edit marks and save your changes.",
  ai: "Create teaching drafts from class resources, then review and approve them.",
  timetable: "Plan your teaching week with class times and room details.",
  notifications: "Updates and actions for your current teaching context.",
  search:
    "Search classes, assignments, learners and teaching materials you can access.",
  blocked:
    "Your teaching schedule and the availability of this school service.",
}
export function TeacherPageShell({
  title,
  view,
  children,
}: {
  title: string
  view: WorkspaceViewKey
  children: ReactNode
}) {
  return (
    <div className={`mx-auto max-w-[1440px] px-4 lg:px-6 ${styles.canvas}`}>
      <div className={styles.page}>
        <TeacherPageHeader
          title={title}
          description={
            descriptions[view] ??
            "Manage your teaching work in the current school context."
          }
          action={
            view === "assignments" ? (
              <Button asChild>
                <Link href="/teacher/assignments/new">Create assignment</Link>
              </Button>
            ) : view === "classes" ? (
              <Button asChild variant="outline">
                <Link href="/teacher/timetable">View timetable</Link>
              </Button>
            ) : undefined
          }
        />
        {children}
      </div>
    </div>
  )
}
