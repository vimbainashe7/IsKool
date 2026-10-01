import Link from "next/link"
import { ArrowRight, CheckCircle2, Download, FileUp, ListChecks, WandSparkles } from "lucide-react"

import { EmptyState, ErrorState, PermissionState } from "@/components/feedback/state-views"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentSession } from "@/features/context/get-current-session"
import type { Capability } from "@/lib/permissions/capabilities"
import { hasCapability, type RoleKey } from "@/lib/permissions/capabilities"

export type FlowSkeleton = {
  title: string
  eyebrow: string
  description: string
  primaryAction: string
  capability: Capability
  focus: string[]
  states: {
    empty: string
    error: string
    permission: string
  }
}

function getFlowAction(flow: FlowSkeleton, role: RoleKey) {
  const title = flow.title.toLowerCase()

  if (role === "teacher") {
    if (title.includes("assignment")) {
      return { label: "Create assignment", href: "/teacher/ai?tool=create-assignment", icon: WandSparkles }
    }
    if (title.includes("revision")) {
      return { label: "Create revision test", href: "/teacher/ai?tool=create-test", icon: WandSparkles }
    }
    if (title.includes("test")) {
      return { label: "Create exam questions", href: "/teacher/ai?tool=create-test", icon: WandSparkles }
    }
    if (title.includes("classes") || title.includes("subjects")) {
      return { label: flow.primaryAction, href: "/teacher/dashboard", icon: ArrowRight }
    }
  }

  if (role === "student") {
    if (title.includes("assignment")) {
      return { label: "Submit assignment", href: "/student/assignments/demo-assignment", icon: FileUp }
    }
    if (title.includes("test") || title.includes("revision")) {
      return { label: "Download work", href: `/${title.includes("revision") ? "revision-tests" : "tests"}`, icon: Download }
    }
    if (title.includes("classes") || title.includes("subjects")) {
      return { label: "View learning", href: title.includes("subjects") ? "/subjects" : "/classes", icon: ArrowRight }
    }
  }

  if (role === "admin") {
    if (["students", "admissions", "finance", "attendance", "staff", "reports"].some((item) => title.includes(item))) {
      return { label: flow.primaryAction, href: `/${title.includes("reports") ? "reports" : title.split(" ")[0]}`, icon: ArrowRight }
    }
    if (title.includes("classes")) {
      return { label: "Manage classes", href: "/classes", icon: ArrowRight }
    }
  }

  return { label: "Open workspace", href: "/home", icon: ArrowRight }
}

function roleGuidance(flow: FlowSkeleton, role: RoleKey) {
  const title = flow.title.toLowerCase()

  if (role === "student" && (title.includes("assignment") || title.includes("test") || title.includes("revision"))) {
    return [
      "View published work from teachers",
      "Download instructions and resources",
      "Submit completed work privately",
      "Receive teacher feedback and notes",
    ]
  }

  if (role === "teacher" && (title.includes("assignment") || title.includes("test") || title.includes("revision"))) {
    return [
      "Create and review drafts",
      "Upload supporting material",
      "Publish to selected classes",
      "Review submissions and feedback",
    ]
  }

  if (role === "admin" && (title.includes("assignment") || title.includes("test") || title.includes("revision"))) {
    return [
      "Admins do not create academic work here",
      "Use school operations pages instead",
      "Academic publishing belongs to teachers",
      "Access remains controlled by backend policy",
    ]
  }

  return flow.focus
}

export async function FlowSkeletonPage({ flow }: { flow: FlowSkeleton }) {
  const session = await getCurrentSession()
  const role = session?.context.activeRole ?? "student"
  const canView = hasCapability(session?.context.capabilities ?? [], flow.capability)
  const action = getFlowAction(flow, role)
  const ActionIcon = action.icon
  const focus = roleGuidance(flow, role)

  return (
    <PageShell
      eyebrow={flow.eyebrow}
      title={flow.title}
      description={flow.description}
      icon={ListChecks}
      action={
        <Button asChild className="bg-iskool-cream text-iskool-navy hover:bg-white">
          <Link href={action.href}>
            {action.label}
            <ActionIcon className="size-4" />
          </Link>
        </Button>
      }
    >

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden py-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              <CardTitle>Workflow structure</CardTitle>
            </div>
            <CardDescription>
              Production UI will connect this screen to backend contracts. This skeleton is intentionally explicit about states and capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pb-6 sm:grid-cols-2">
            {focus.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-iskool-cream bg-iskool-cream/35 p-4 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-iskool-blue">
                  <CheckCircle2 className="size-4" />
                </span>
                <span className="font-medium text-iskool-midnight">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canView ? (
            <EmptyState
              title={`${flow.title} workspace`}
              description={flow.states.empty}
              actionLabel={action.label}
              actionHref={action.href}
            />
          ) : (
            <PermissionState
              title="Permission boundary"
              description={`${flow.states.permission} Required UI capability: ${flow.capability}. Server authorization and RLS still decide access.`}
            />
          )}
          <ErrorState
            title="Recoverable error"
            description={flow.states.error}
            actionLabel="Retry"
            actionHref={`/${flow.title.toLowerCase().replace(/\s+/g, "-")}`}
          />
        </div>
      </div>
    </PageShell>
  )
}
