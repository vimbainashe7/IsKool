"use client"
import { GraduationCap, Sparkles } from "lucide-react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { studentDashboardModel } from "./model"
import { StudentCourseGrid } from "./student-courses"
import { StudentCalendarCard } from "./student-calendar"
import { UpcomingTasksCard, StudentScheduleStrip } from "./upcoming-tasks"
import { RecentFeedback } from "./student-feedback"
import styles from "./student-dashboard.module.css"
import { LiveStudentDashboardContent } from "@/features/classes/dashboard-classes"
export function StudentDashboard({ studentName }: { studentName: string }) {
  const { data: w } = useWorkspace()
  const model = studentDashboardModel(w)
  const firstName = studentName.trim().split(/\s+/)[0]
  const subtitle = model.pending.length
    ? `You have ${model.pending.length} ${model.pending.length === 1 ? "assignment" : "assignments"} waiting for submission.`
    : model.nextClass
      ? `Your next class starts at ${model.nextClass.start.slice(0, 5)}.`
      : "Here’s what needs your attention today."
  return (
    <div className={styles.canvas}>
      <div className={styles.dashboard}>
        <StudentWelcomeBanner firstName={firstName} subtitle={subtitle} />
        {w.mode === "live" ? (
          <LiveStudentDashboardContent />
        ) : (
          <>
            <StudentCourseGrid model={model} />
            <StudentScheduleStrip model={model} warnings={w.warnings} />
            <RecentFeedback model={model} />
            <aside
              className={styles.rail}
              aria-label="Schedule and upcoming work"
            >
              <StudentCalendarCard model={model} />
              <UpcomingTasksCard model={model} asOf={w.asOf} />
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
function StudentWelcomeBanner({
  firstName,
  subtitle,
}: {
  firstName: string
  subtitle: string
}) {
  return (
    <section className={styles.welcome} aria-label="Welcome">
      <div className={styles.welcomeText}>
        <p className={styles.welcomeEyebrow}>
          <Sparkles size={13} aria-hidden="true" /> A little progress, every day
        </p>
        <h1>
          <span className="sr-only">Student dashboard. </span>
          {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
        </h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.heroVisual} aria-hidden="true">
        <span className={styles.heroOrbit} />
        <span className={styles.heroDisc}>
          <GraduationCap strokeWidth={1.3} />
        </span>
        <span className={styles.heroSpark}>✦</span>
        <span className={styles.heroDot} />
      </div>
    </section>
  )
}
