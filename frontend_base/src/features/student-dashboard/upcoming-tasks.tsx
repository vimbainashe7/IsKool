import Link from "next/link"
import { ArrowUpRight, ChevronRight, FileText, Check } from "lucide-react"
import type { Workspace } from "@/features/workspace/contracts"
import { deadlineLabel, type StudentDashboardModel } from "./model"
import styles from "./student-dashboard.module.css"
export function UpcomingTasksCard({
  model,
  asOf,
}: {
  model: StudentDashboardModel
  asOf: string
}) {
  const visibleTaskIds = new Set(
    model.pending.slice(0, 5).map((task) => task.id)
  )
  return (
    <section aria-labelledby="student-tasks-title" className={styles.tasksArea}>
      <div className={styles.sectionHeading}>
        <h2 id="student-tasks-title">Upcoming Tasks</h2>
        <Link href="/student/assignments">
          See all <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      {model.pending.length ? (
        <div className={styles.taskGroups}>
          {model.tasks.map((group) => {
            const items = group.items.filter((task) =>
              visibleTaskIds.has(task.id)
            )
            return items.length ? (
              <div key={group.label}>
                <h3 className={styles.groupLabel}>{group.label}</h3>
                <ul className={styles.taskList}>
                  {items.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/student/assignments/${task.id}`}
                        className={styles.task}
                      >
                        <span
                          className={`${styles.taskIcon} ${group.label === "Overdue" ? styles.overdueIcon : ""}`}
                        >
                          <FileText size={20} aria-hidden="true" />
                        </span>
                        <div className={styles.taskText}>
                          <h4>{task.title}</h4>
                          <p>
                            {model.classes.find((c) => c.id === task.classId)
                              ?.name ?? "Your class"}
                          </p>
                          <span
                            className={
                              group.label === "Overdue"
                                ? styles.overdueLabel
                                : styles.dueLabel
                            }
                          >
                            {deadlineLabel(task, asOf)}
                          </span>
                        </div>
                        <ChevronRight size={17} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Check aria-hidden="true" size={25} />
          <strong>You&apos;re all caught up.</strong>
          <p>No assignments are waiting for submission.</p>
        </div>
      )}
    </section>
  )
}
export function StudentScheduleStrip({
  model,
  warnings,
}: {
  model: StudentDashboardModel
  warnings: Workspace["warnings"]
}) {
  if (!model.schedule.length)
    return (
      <section className={styles.scheduleArea} aria-label="Today's schedule">
        <p className={styles.meta}>
          {warnings.some((w) => /timetable/i.test(w))
            ? "Your schedule is temporarily unavailable."
            : "No classes scheduled today."}{" "}
          <Link href="/student/timetable" className={styles.inlineLink}>
            View timetable
          </Link>
        </p>
      </section>
    )
  return (
    <section
      className={styles.scheduleArea}
      aria-labelledby="student-schedule-title"
    >
      <div className={styles.sectionHeading}>
        <h2 id="student-schedule-title">Today&apos;s schedule</h2>
        <Link href="/student/timetable">
          Timetable <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <div className={styles.scheduleStrip}>
        {model.schedule.slice(0, 3).map((slot) => (
          <Link key={slot.id} href={`/student/classes/${slot.classId}`}>
            <span>{slot.start.slice(0, 5)}</span>
            <strong>
              {model.classes.find((c) => c.id === slot.classId)?.name ??
                "Your class"}
            </strong>
            {slot.room ? <small>{slot.room}</small> : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
