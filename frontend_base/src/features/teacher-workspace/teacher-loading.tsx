import { Skeleton } from "@/components/ui/skeleton"
import styles from "./teacher-workspace.module.css"
export function TeacherLoading({
  kind = "page",
}: {
  kind?: "dashboard" | "classes" | "page"
}) {
  return (
    <div
      className="mx-auto max-w-[1440px] px-4 lg:px-6"
      role="status"
      aria-label="Loading teacher workspace"
    >
      <div className={styles.page}>
        <Skeleton
          className={
            kind === "dashboard" ? "h-44 rounded-2xl" : "h-24 rounded-2xl"
          }
        />
        {kind === "dashboard" ? (
          <>
            <div className={styles.quickGrid}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton className="h-32 rounded-2xl" key={i} />
              ))}
            </div>
            <div className={styles.lower}>
              {[0, 1, 2].map((i) => (
                <Skeleton className="h-72 rounded-2xl" key={i} />
              ))}
            </div>
          </>
        ) : kind === "classes" ? (
          <div className={styles.classGrid}>
            {[0, 1, 2].map((i) => (
              <Skeleton className="h-80 rounded-2xl" key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className={styles.summaries}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton className="h-24 rounded-2xl" key={i} />
              ))}
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </>
        )}
      </div>
    </div>
  )
}
