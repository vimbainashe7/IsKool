import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <div
      className="space-y-5 px-5"
      role="status"
      aria-label="Loading workspace"
    >
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-60 w-full" />
    </div>
  )
}
