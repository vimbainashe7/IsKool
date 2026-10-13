import Link from "next/link"
import { ArrowUpRight, Award, BookOpen, MessageSquare } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { StudentDashboardModel } from "./model"
import styles from "./student-dashboard.module.css"
export function RecentFeedback({ model }: { model: StudentDashboardModel }) {
  return (
    <section
      className={styles.feedbackArea}
      aria-labelledby="student-feedback-title"
    >
      <div className={styles.sectionHeading}>
        <h2 id="student-feedback-title">
          {model.feedback.length ? "Recently graded" : "Learning Progress"}
        </h2>
        <Link href="/student/grades">
          View feedback <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <div className={styles.feedbackGrid}>
        {model.feedback.length ? (
          model.feedback.map((grade, i) => (
            <Card
              key={grade.id}
              className={`${styles.feedbackCard} ${i === 0 ? styles.feedbackWarm : ""}`}
            >
              <MessageSquare
                aria-hidden="true"
                className={styles.feedbackGraphic}
              />
              <p className={styles.meta}>{grade.className}</p>
              <h3>{grade.assignment.title}</h3>
              <strong className={styles.score}>
                {grade.score === null
                  ? "Feedback released"
                  : grade.assignment.totalMarks
                    ? `${grade.score} / ${grade.assignment.totalMarks}`
                    : `${grade.score} marks`}
              </strong>
              <p className={styles.feedbackExcerpt}>
                {grade.feedback || "Your teacher has released this result."}
              </p>
              <Link
                href={`/student/assignments/${grade.assignment.id}`}
                className={styles.feedbackAction}
              >
                View feedback <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </Card>
          ))
        ) : (
          <>
            <Card className={`${styles.feedbackCard} ${styles.feedbackWarm}`}>
              <Award className={styles.feedbackGraphic} aria-hidden="true" />
              <p className={styles.meta}>Your coursework</p>
              <h3>
                {model.submittedCount}{" "}
                {model.submittedCount === 1 ? "assignment" : "assignments"}{" "}
                submitted
              </h3>
              <p className={styles.feedbackExcerpt}>
                {model.assignments.length
                  ? `${model.submittedCount} of ${model.assignments.length} published assignments submitted. Keep your learning moving.`
                  : "Completed coursework will appear here as you progress."}
              </p>
              <Link
                href="/student/assignments"
                className={styles.feedbackAction}
              >
                View assignments <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </Card>
            <Card className={styles.feedbackCard}>
              <BookOpen className={styles.feedbackGraphic} aria-hidden="true" />
              <p className={styles.meta}>Keep exploring</p>
              <h3>
                {model.resources.length} published{" "}
                {model.resources.length === 1 ? "resource" : "resources"}
              </h3>
              <p className={styles.feedbackExcerpt}>
                Your graded work and teacher feedback will appear here.
              </p>
              <Link href="/student/notes" className={styles.feedbackAction}>
                Open resources <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </Card>
          </>
        )}
      </div>
    </section>
  )
}
