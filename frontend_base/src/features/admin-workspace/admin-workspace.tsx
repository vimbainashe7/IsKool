"use client"
import { StudentAdministration } from "@/features/students/student-administration"
import {
  EnrollmentOverview,
  SchoolClassOverview,
} from "@/features/students/enrollment-overview"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { AdminPeople, AdminClasses } from "@/features/admin/admin-workspace"
import type { WorkspaceViewKey } from "@/features/workspace/workspace-view"
import type { Capability } from "@/lib/permissions/capabilities"
import {
  AdminAccess,
  AdminPageHeader,
  AdminLink,
  AdminSectionCard,
} from "./admin-components"
import { AdminDashboard } from "./admin-dashboard"
import {
  AdminPageMetrics,
  AdminClassDetail,
  AdminRoleDefinitions,
  AdminTimetable,
  AdminAudit,
  AdminReports,
  AdminOperations,
  AdmissionsPipelineCard,
} from "./admin-pages"
import styles from "./admin-workspace.module.css"

const descriptions: Partial<Record<WorkspaceViewKey, string>> = {
  "admin-classes": "Manage school classes, teacher assignments and enrollment.",
  class:
    "Review teaching assignments, enrolled students and scheduled lessons.",
  users: "Review school memberships, invitations and confirmed access changes.",
  students:
    "Create student records, link guardians and manage enrollment history.",
  teachers: "Review teaching memberships and school class assignments.",
  enrollments: "Review current class enrollment and assign active students.",
  roles: "Review defined roles and confirm changes to school access.",
  audit:
    "Review recorded school changes and filter activity by action, actor or date.",
  timetable: "Review scheduled lessons and overlaps across your school.",
}
export function AdminWorkspace({
  view,
  title,
  resourceId,
  name,
  school,
  capabilities,
}: {
  view: WorkspaceViewKey
  title: string
  resourceId?: string
  name: string
  school: string
  capabilities: readonly Capability[]
}) {
  const { data: workspace } = useWorkspace()
  const liveStudents = view === "students" && workspace.mode === "live"
  let content
  if (liveStudents)
    content = (
      <StudentAdministration
        key={resourceId ?? "list"}
        studentId={resourceId}
      />
    )
  else if (
    workspace.mode === "live" &&
    ["users", "teachers", "roles", "class", "audit", "timetable"].includes(view)
  )
    content = (
      <AdminSectionCard title="Records unavailable">
        <p>
          This school workflow is not connected yet. No records or totals are
          inferred from missing data.
        </p>
      </AdminSectionCard>
    )
  else if (["users", "students", "teachers", "roles"].includes(view))
    content = (
      <>
        {view === "roles" && <AdminRoleDefinitions />}
        <AdminPeople
          key={resourceId ?? view}
          kind={view as "users" | "students" | "teachers" | "roles"}
          memberId={resourceId}
        />
      </>
    )
  else if (view === "admin-classes")
    content =
      workspace.mode === "live" ? <SchoolClassOverview /> : <AdminClasses />
  else if (view === "enrollments" && workspace.mode === "live")
    content = (
      <>
        <AdmissionsPipelineCard />
        <EnrollmentOverview />
      </>
    )
  else if (view === "enrollments")
    content = (
      <>
        <AdmissionsPipelineCard />
        <AdminClasses enrollment />
      </>
    )
  else if (view === "class")
    content = <AdminClassDetail id={resourceId ?? ""} />
  else if (view === "timetable") content = <AdminTimetable />
  else if (view === "audit") content = <AdminAudit />
  else if (title === "Reports") content = <AdminReports />
  else content = <AdminOperations title={title} />
  const description =
    descriptions[view] ??
    (title === "Reports"
      ? "Explore available school records and the report catalogue."
      : title === "Finance"
        ? "Review fee collection and the availability of school payment records."
        : title === "Attendance exceptions"
          ? "Review attendance availability and today’s school schedule."
          : title === "Staff and HR"
            ? "Review staff service availability and teaching or administration accounts."
            : "View your school configuration and account settings.")
  return (
    <AdminAccess capabilities={capabilities}>
      {view === "dashboard" ? (
        <AdminDashboard name={name} school={school} />
      ) : (
        <div className={styles.page}>
          <AdminPageHeader
            title={title}
            description={description}
            action={
              !resourceId &&
              (view === "users" ? (
                <AdminLink
                  href="#invite-member"
                  capability="users.manage"
                  className={styles.headerAction}
                >
                  Invite member
                </AdminLink>
              ) : view === "admin-classes" ? (
                <AdminLink
                  href={
                    workspace.mode === "live"
                      ? "/admin/students"
                      : "#create-class"
                  }
                  capability="classes.manage"
                  className={styles.headerAction}
                >
                  Create class
                </AdminLink>
              ) : view === "enrollments" ? (
                <AdminLink
                  href={
                    workspace.mode === "live"
                      ? "/admin/students"
                      : "#assign-teacher"
                  }
                  capability="enrollments.manage"
                  className={styles.headerAction}
                >
                  Enroll student
                </AdminLink>
              ) : undefined)
            }
          />
          {!resourceId && !liveStudents && (
            <AdminPageMetrics view={view} title={title} />
          )}
          {content}
          <p className={styles.note}>
            {liveStudents
              ? "Student records are saved in your school registry."
              : "Counts reflect the school records currently loaded in your workspace."}
          </p>
        </div>
      )}
    </AdminAccess>
  )
}
