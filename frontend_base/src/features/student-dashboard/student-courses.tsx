import Link from "next/link"
import {
  Atom,
  BookOpen,
  CircuitBoard,
  Code2,
  Globe2,
  Sigma,
  Briefcase,
  ArrowUpRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { StudentDashboardModel } from "./model"
import styles from "./student-dashboard.module.css"
function SubjectIcon({ subject }: { subject: string }) {
  if (/computer|program/i.test(subject)) return <Code2 strokeWidth={1.4} />
  if (/math/i.test(subject)) return <Sigma strokeWidth={1.4} />
  if (/physics|chem|science/i.test(subject)) return <Atom strokeWidth={1.4} />
  if (/electron/i.test(subject)) return <CircuitBoard strokeWidth={1.4} />
  if (/geograph/i.test(subject)) return <Globe2 strokeWidth={1.4} />
  if (/business|commerce/i.test(subject)) return <Briefcase strokeWidth={1.4} />
  return <BookOpen strokeWidth={1.4} />
}
export function StudentCourseGrid({ model }: { model: StudentDashboardModel }) {
  return (
    <section
      aria-labelledby="student-courses-title"
      className={styles.coursesArea}
    >
      <div className={styles.sectionHeading}>
        <h2 id="student-courses-title">My Courses</h2>
        <Link href="/student/classes">
          View all <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      {model.courses.length ? (
        <div className={styles.courseGrid}>
          {model.courses.map((course, index) => (
            <StudentCourseCard key={course.id} course={course} index={index} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          Your enrolled classes will appear here.
        </div>
      )}
    </section>
  )
}
function StudentCourseCard({
  course,
  index,
}: {
  course: StudentDashboardModel["courses"][number]
  index: number
}) {
  const progress = course.assignments
    ? Math.round((course.submitted / course.assignments) * 100)
    : 0
  return (
    <Link
      href={`/student/classes/${course.id}`}
      className={styles.courseLink}
      aria-label={`Open ${course.name}`}
    >
      <Card
        className={`${styles.course} ${course.highlighted ? styles.nextCourse : ""}`}
      >
        <div
          className={`${styles.courseVisual} ${styles[`tint${index % 3}`]}`}
          aria-hidden="true"
        >
          <span className={styles.visualOrbit} />
          <div className={styles.subjectEmblem}>
            <SubjectIcon subject={course.subject || course.name} />
          </div>
          <span className={styles.visualSpark}>+</span>
        </div>
        <div className={styles.courseBody}>
          <div className={styles.courseTitleRow}>
            <h3>{course.name}</h3>
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>
          <p className={styles.meta}>
            {course.teacher ??
              (course.yearLevel || course.subject || "Enrolled class")}
          </p>
          <p className={styles.courseActivity}>
            {course.nextSlot
              ? `Next class ${course.nextSlot.start.slice(0, 5)}`
              : course.nextTask
                ? course.nextTask.title
                : "Explore your class"}
          </p>
          {course.assignments > 0 ? (
            <>
              <Progress
                value={progress}
                aria-label={`${course.name}: assignments submitted`}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className={styles.progress}
              />
              <p className={styles.courseStats}>
                <span>
                  {course.submitted}/{course.assignments} submitted
                </span>
                <span>
                  {course.resources}{" "}
                  {course.resources === 1 ? "resource" : "resources"}
                </span>
              </p>
            </>
          ) : (
            <p className={styles.meta}>
              {course.resources} published{" "}
              {course.resources === 1 ? "resource" : "resources"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
