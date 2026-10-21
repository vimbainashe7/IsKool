"use client"
import Link from "next/link"
import { BookOpen, ArrowUpRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { TeacherSectionCard } from "@/features/teacher-workspace/teacher-components"
import studentStyles from "@/features/student-dashboard/student-dashboard.module.css"
import teacherStyles from "@/features/teacher-workspace/teacher-workspace.module.css"
import { AssignmentList } from "@/features/assignments/live-assignments"

export function DashboardClasses({ role }: { role: "student" | "teacher" }) {
  const { data } = useWorkspace()
  const context = data.academicContext
  if (!context || context.role !== role)
    return (
      <p role="alert">
        Your classes could not be loaded. Reload this page to retry.
      </p>
    )
  const student = role === "student"
  const styles = student ? studentStyles : teacherStyles
  return (
    <section
      className={student ? studentStyles.coursesArea : teacherStyles.section}
      aria-label="Current classes"
    >
      <div className={styles.sectionHeading}>
        <h2>{student ? "My Courses" : "My Classes"}</h2>
        <Link href={`/${role}/classes`} prefetch={false}>
          View all <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <p className={styles.meta}>
        {context.totalClasses} {student ? "enrolled" : "assigned"}{" "}
        {context.totalClasses === 1 ? "class" : "classes"}
      </p>
      <div className={student ? studentStyles.courseGrid : "space-y-4"}>
        {context.classes.map((c) => (
          <Link
            key={c.id}
            href={`/${role}/classes/${c.id}`}
            prefetch={false}
            className={
              student
                ? `${studentStyles.courseLink} ${context.classes.length === 1 ? "col-span-full" : ""}`
                : "block"
            }
          >
            <Card className={student ? studentStyles.course : "p-4"}>
              {student && (
                <div
                  className={`${studentStyles.courseVisual} ${studentStyles.tint0}`}
                  aria-hidden="true"
                >
                  <BookOpen />
                </div>
              )}
              <div className={student ? studentStyles.courseBody : "space-y-2"}>
                <h3 className="font-semibold">{c.name}</h3>
                <p className={styles.meta}>{c.academicYear.label}</p>
                {c.terms.length ? (
                  c.terms.map((term) => (
                    <p className={styles.meta} key={term.id}>
                      {term.label}: {term.startsOn} to {term.endsOn}
                    </p>
                  ))
                ) : (
                  <p className={styles.meta}>No current academic term.</p>
                )}
                {!student && (
                  <p>
                    {c.studentCount === null
                      ? "Student count unavailable"
                      : `${c.studentCount} active ${c.studentCount === 1 ? "student" : "students"}`}
                  </p>
                )}
                <p className={styles.meta}>
                  Open class{" "}
                  <ArrowUpRight
                    className="inline"
                    size={14}
                    aria-hidden="true"
                  />
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {context.totalClasses === 0 && (
        <p className={styles.empty}>
          {student
            ? "No active enrollment is linked to your account. Ask your school administrator to check your student account and current enrollment."
            : "No classes are currently assigned to you. Ask your school administrator to check your teaching assignments."}
        </p>
      )}
      {context.totalClasses > context.classes.length && (
        <p className={`${styles.meta} mt-3`}>
          Showing {context.classes.length} of {context.totalClasses}.{" "}
          <Link
            className="underline"
            href={`/${role}/classes`}
            prefetch={false}
          >
            View all classes
          </Link>
        </p>
      )}
    </section>
  )
}

export function LiveStudentDashboardContent() {
  return (
    <>
      <DashboardClasses role="student" />
      <section
        className={studentStyles.scheduleArea}
        aria-label="Today's schedule"
      >
        <p className={studentStyles.meta}>Timetable is not available yet.</p>
      </section>
      <section
        className={studentStyles.feedbackArea}
        aria-labelledby="live-progress-title"
      >
        <div className={studentStyles.sectionHeading}>
          <h2 id="live-progress-title">Learning Progress</h2>
        </div>
        <Card className={studentStyles.feedbackCard}>
          <p>Grades and feedback are not available yet.</p>
          <p className={studentStyles.meta}>
            Released results will appear here when grading is available.
          </p>
        </Card>
      </section>
      <aside className={studentStyles.rail} aria-label="Academic services">
        <section className={studentStyles.tasksArea}>
          <h2 className="mb-4 font-semibold">Upcoming Tasks</h2>
          <div className={studentStyles.empty}>
            Assignments are not available yet.
          </div>
        </section>
        <Card
          className={`${studentStyles.calendarArea} ${studentStyles.calendarCard}`}
        >
          <h2 className="mb-4 font-semibold">Study resources</h2>
          <p className={studentStyles.meta}>
            Materials and notifications are not available yet.
          </p>
        </Card>
      </aside>
    </>
  )
}

export function LiveTeacherDashboardContent() {
  const { data } = useWorkspace()
  return (
    <div className={teacherStyles.lower}>
      <DashboardClasses role="teacher" />
      <AssignmentList key={`${data.schoolId}:${data.membershipId}`} compact />
      <TeacherSectionCard title="Today's Plan">
        <p className={teacherStyles.meta}>Timetable is not available yet.</p>
      </TeacherSectionCard>
      <TeacherSectionCard title="Submission review">
        <p>Submission review is not available yet.</p>
        <p className={teacherStyles.meta}>
          Grading tasks, teaching materials and notifications are
          not available yet.
        </p>
      </TeacherSectionCard>
    </div>
  )
}
