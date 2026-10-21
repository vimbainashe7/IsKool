"use client"
import dynamic from "next/dynamic"
import { useState } from "react"
import { useSearch } from "./use-search"
import Link from "next/link"
import { useWorkspace } from "./workspace-provider"
import { RoleDashboard } from "./dashboard"
import { Records } from "./records"
import { SubmissionWorkflow } from "@/features/storage/submission-workflow"
import { MaterialWorkflow } from "@/features/storage/material-workflow"
import { AssignmentEditor } from "@/features/assignments/assignment-editor"
import { SubmissionReview } from "@/features/assignments/submission-review"
import { AdminPeople, AdminClasses } from "@/features/admin/admin-workspace"
import { PermissionState, EmptyState } from "@/components/feedback/state-views"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthorizedClasses } from "@/features/classes/authorized-classes"
import { StudentWork } from '@/features/assignments/student-work'
import { safeReturnPath } from "@/lib/auth/safe-return-path"
import type { RoleKey } from "@/lib/permissions/capabilities"
const Gradebook = dynamic(
  () => import("@/features/gradebook/gradebook").then((m) => m.Gradebook),
  { loading: () => <p role="status">Loading gradebook…</p> }
)
const AiStudio = dynamic(
  () => import("@/features/ai/ai-studio").then((m) => m.AiStudio),
  { loading: () => <p role="status">Loading AI Studio…</p> }
)
export type WorkspaceViewKey =
  | "dashboard"
  | "classes"
  | "class"
  | "assignments"
  | "assignment"
  | "new-assignment"
  | "materials"
  | "notes"
  | "grades"
  | "timetable"
  | "notifications"
  | "submissions"
  | "gradebook"
  | "ai"
  | "users"
  | "students"
  | "teachers"
  | "roles"
  | "admin-classes"
  | "enrollments"
  | "audit"
  | "search"
  | "blocked"
export function WorkspaceView({
  view,
  role,
  resourceId,
}: {
  view: WorkspaceViewKey
  role: RoleKey
  resourceId?: string
}) {
  const { data: w } = useWorkspace()
  const className = (id: string) =>
    w.classes.find((c) => c.id === id)?.name ?? "Class"
  const [query, setQuery] = useState("")
  const search = useSearch(query)
  if(w.mode === 'live' && role === 'student' && (view === 'assignments' || view === 'assignment'))
    return <StudentWork resourceId={view === 'assignment' ? resourceId : undefined}/>
  if (
    w.mode === "live" &&
    role === "student" &&
    (view === "classes" || view === "class")
  )
    return (
      <AuthorizedClasses
        key={`${w.schoolId}:${w.membershipId}:${view}:${resourceId ?? ""}`}
        role="student"
        resourceId={view === "class" ? resourceId : undefined}
      />
    )
  if (view === "dashboard") return <RoleDashboard role={role} />
  if (view === "gradebook") return <Gradebook />
  if (view === "ai") return <AiStudio />
  if (view === "submissions") return <SubmissionReview />
  if (view === "new-assignment") return <AssignmentEditor />
  if (view === "materials") return <MaterialWorkflow />
  if (view === "assignment") {
    if (role === "student")
      return <SubmissionWorkflow assignmentId={resourceId ?? ""} />
    const assignment = w.assignments.find((a) => a.id === resourceId)
    return assignment ? (
      <AssignmentEditor key={assignment.id} assignment={assignment} />
    ) : (
      <PermissionState
        title="This assignment is not available"
        description="Return to your assignments to choose work you can access."
      />
    )
  }
  if (["users", "students", "teachers", "roles"].includes(view))
    return (
      <AdminPeople
        kind={view as "users" | "students" | "teachers" | "roles"}
        memberId={resourceId}
      />
    )
  if (view === "admin-classes") return <AdminClasses />
  if (view === "enrollments") return <AdminClasses enrollment />
  if (view === "audit")
    return (
      <Records
        title="Audit events"
        empty="No audited events are available."
        items={w.audit.map((a) => ({
          id: a.id,
          title: a.action,
          detail: `${a.actor} · ${new Date(a.at).toLocaleString("en-ZW", { timeZone: "Africa/Harare" })}`,
        }))}
      />
    )
  if (view === "classes")
    return (
      <Records
        title="Your classes"
        empty="No classes are assigned to this work context."
        items={w.classes.map((c) => ({
          id: c.id,
          title: c.name,
          detail: `${c.subject} · ${c.yearLevel}`,
          href: `/${role}/classes/${c.id}`,
        }))}
      />
    )
  if (view === "class") {
    const c = w.classes.find((c) => c.id === resourceId)
    if (!c)
      return (
        <PermissionState
          title="This class is not available"
          description="Return to your classes to choose a class you can access."
        />
      )
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{c.name}</h2>
        <p>
          {c.subject} · {c.yearLevel}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/${role}/assignments`}>Assignments</Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={
                role === "teacher"
                  ? "/teacher/materials"
                  : role === "student"
                    ? "/student/notes"
                    : "/admin/enrollments"
              }
            >
              {role === "admin" ? "Manage enrollment" : "Materials"}
            </Link>
          </Button>
          {role === "teacher" && (
            <Button asChild>
              <Link href="/teacher/assignments/new">Create assignment</Link>
            </Button>
          )}
        </div>
        <Records
          title="Class assignments"
          empty="No assignments are available in this class."
          items={w.assignments
            .filter((a) => a.classId === c.id)
            .map((a) => ({
              id: a.id,
              title: a.title,
              status: a.status,
              href:
                role === "admin" ? undefined : `/${role}/assignments/${a.id}`,
            }))}
        />
        {role !== "student" && (
          <Records
            title="Class learners"
            empty="No learners have been enrolled."
            items={w.enrollments
              .filter((e) => e.classId === c.id)
              .map((e) => ({
                id: e.memberId,
                title:
                  w.members.find((m) => m.id === e.memberId)?.name ?? "Learner",
                href:
                  role === "admin" ? `/admin/users/${e.memberId}` : undefined,
              }))}
          />
        )}
      </div>
    )
  }
  if (view === "assignments")
    return (
      <div className="space-y-5">
        {role === "teacher" && (
          <Button asChild>
            <Link href="/teacher/assignments/new">Create assignment</Link>
          </Button>
        )}
        <Records
          title="Assignments"
          empty={
            role === "student"
              ? "You’re all caught up. New work from your teachers will appear here."
              : "Create an assignment for your class to get started."
          }
          items={w.assignments.map((a) => ({
            id: a.id,
            title: a.title,
            detail: `${className(a.classId)} · ${a.dueAt ? new Date(a.dueAt).toLocaleString("en-ZW", { timeZone: "Africa/Harare" }) : "No deadline set"}`,
            status: a.status,
            href: `/${role}/assignments/${a.id}`,
          }))}
        />
      </div>
    )
  if (view === "notes")
    return (
      <div className="space-y-6">
        <Records
          title="Published learning materials"
          empty="Your teacher’s published resources will appear here."
          items={w.materials
            .filter((m) => m.status === "published")
            .map((m) => ({
              id: m.id,
              title: m.title,
              detail: `${className(m.classId)} · ${m.filename}`,
              href: `/api/files?type=material&id=${m.id}`,
            }))}
        />
        <Records
          title="Published revision notes"
          empty="No compiled notes are published yet."
          items={w.drafts
            .filter((d) => d.status === "published")
            .map((d) => ({ id: d.id, title: d.title, detail: d.body }))}
        />
      </div>
    )
  if (view === "grades")
    return (
      <Records
        title="Your released grades and feedback"
        empty="Your teacher’s released marks and feedback will appear here."
        items={w.grades
          .filter((g) => g.publishedAt)
          .map((g) => {
            const submission = w.submissions.find(
              (s) => s.id === g.submissionId
            )
            const a = w.assignments.find(
              (a) => a.id === submission?.assignmentId
            )
            return {
              id: g.id,
              title: `${a?.title ?? "Assessment"}: ${g.score ?? "pending"}${a?.totalMarks ? ` / ${a.totalMarks}` : ""}`,
              detail: g.feedback || "No written feedback yet",
              href: a ? `/student/assignments/${a.id}` : undefined,
            }
          })}
      />
    )
  if (view === "timetable")
    return (
      <Records
        title="Weekly timetable"
        empty="No lessons are scheduled yet."
        items={[...w.timetable]
          .sort(
            (a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)
          )
          .map((t) => ({
            id: t.id,
            title: `${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][t.weekday - 1]} · ${className(t.classId)}`,
            detail: `${t.start.slice(0, 5)}–${t.end.slice(0, 5)} · ${t.room} (Harare)`,
            href: `/${role}/classes/${t.classId}`,
          }))}
      />
    )
  if (view === "notifications")
    return (
      <Records
        title="Notifications"
        empty="No notifications require your attention."
        items={w.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          detail: n.body,
          href: safeReturnPath(n.href),
        }))}
      />
    )
  if (view === "search")
    return (
      <section className="space-y-4">
        <Label htmlFor="global-search">Search your authorized workspace</Label>
        <Input
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Class, assignment or material"
        />
        {search.status && <p role="status">{search.status}</p>}
        <Records
          title="Search results"
          empty="Type a search to find work in your current context."
          items={search.results.map((result) => ({
            id: result.id,
            title: result.title,
            detail: result.group,
            href: result.href,
          }))}
        />
      </section>
    )
  return (
    <EmptyState
      title="This school service is not connected yet"
      description="Your school’s service must be connected before this workflow can load records or confirm changes. Return to the dashboard for available work."
      actionLabel="Open dashboard"
      actionHref="/home"
    />
  )
}
