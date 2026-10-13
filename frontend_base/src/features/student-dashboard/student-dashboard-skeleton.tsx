import { Skeleton } from "@/components/ui/skeleton"
import styles from "./student-dashboard.module.css"
export function StudentDashboardSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1440px] px-4 lg:px-6"
      role="status"
      aria-label="Loading student dashboard"
    >
      <div className={styles.dashboard}>
        <Skeleton
          className="h-44 rounded-2xl"
          style={{ gridArea: "welcome" }}
        />
        <div className={styles.coursesArea}>
          <Skeleton className="mb-4 h-6 w-36" />
          <div className={styles.courseGrid}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
        <aside
          className={styles.rail}
          aria-label="Loading schedule and upcoming work"
        >
          <Skeleton
            className="h-80 rounded-2xl"
            style={{ gridArea: "calendar" }}
          />
          <div className={styles.tasksArea}>
            <Skeleton className="mb-4 h-6 w-36" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="mb-3 h-20 rounded-2xl" />
            ))}
          </div>
        </aside>
        <Skeleton
          className="h-44 rounded-2xl"
          style={{ gridArea: "feedback" }}
        />
      </div>
    </div>
  )
}
