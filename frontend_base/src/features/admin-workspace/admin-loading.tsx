import { Skeleton } from "@/components/ui/skeleton"
import styles from "./admin-workspace.module.css"
export function AdminLoading({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <div
      className={`mx-auto max-w-[1440px] px-4 lg:px-6 ${styles.canvas}`}
      role="status"
      aria-label="Loading school administration"
    >
      <div className={styles.page}>
        <div>
          <Skeleton className="mb-3 h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className={styles.metrics}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
        <div className={dashboard ? styles.operations : styles.page}>
          {Array.from({ length: dashboard ? 4 : 2 }, (_, i) => (
            <Skeleton key={i} className={styles.skeletonPanel} />
          ))}
        </div>
      </div>
    </div>
  )
}
