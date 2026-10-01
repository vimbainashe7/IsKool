import { FlowSkeletonPage } from "@/features/flow-skeletons/flow-skeleton-page"
import { flowSkeletons } from "@/features/flow-skeletons/flows"

export default function TestsPage() {
  return <FlowSkeletonPage flow={flowSkeletons.tests} />
}
