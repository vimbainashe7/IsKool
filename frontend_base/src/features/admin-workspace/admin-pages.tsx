"use client"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  BookOpen,
  Users,
  GraduationCap,
  UserRoundCheck,
  ClipboardCheck,
  ShieldCheck,
  CalendarDays,
  Wallet,
  FileBarChart,
  CircleAlert,
} from "lucide-react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  roleCapabilities,
  hasCapability,
  type Capability,
} from "@/lib/permissions/capabilities"
import type { WorkspaceViewKey } from "@/features/workspace/workspace-view"
import {
  AdminSectionCard,
  AdminMetricCard,
  AdminEmptyState,
  AdminLink,
  AdminListRow,
  useAdminAccess,
  AdminStatusBadge,
  AdminRetry,
} from "./admin-components"
import { FeeCollectionCard, AdmissionsPipelineCard } from "./admin-dashboard"
import { adminModel, schoolDate, weekdays } from "./model"
import styles from "./admin-workspace.module.css"

export function AdminPageMetrics({
  view,
  title,
}: {
  view: WorkspaceViewKey
  title: string
}) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const known = (v: number) => (m.peopleAvailable ? v : null)
  const slots = (v: number) => (m.timetableAvailable ? v : null)
  type Metric = {
    label: string
    value: number | string | null
    detail: string
    icon: typeof Users
  }
  let metrics: Metric[] = []
  if (view === "admin-classes" || view === "class")
    metrics = [
      {
        label: "School Classes",
        value: m.classes.length,
        detail: "Classes in current school records",
        icon: BookOpen,
      },
      {
        label: "Enrolled Students",
        value: known(m.enrolledStudents.length),
        detail: "Active memberships in a class",
        icon: Users,
      },
      {
        label: "Without Active Teachers",
        value: known(m.unassignedClasses.length),
        detail: "Class assignments needing attention",
        icon: GraduationCap,
      },
      {
        label: "Weekly Lessons",
        value: slots(m.timetable.length),
        detail: "Scheduled timetable periods",
        icon: CalendarDays,
      },
    ]
  else if (view === "students")
    metrics = [
      {
        label: "Student Memberships",
        value: known(m.students.length),
        detail: "Loaded school memberships",
        icon: Users,
      },
      {
        label: "Active Students",
        value: known(m.activeStudents.length),
        detail: "Active school access",
        icon: UserRoundCheck,
      },
      {
        label: "Enrolled Students",
        value: known(m.enrolledStudents.length),
        detail: "Active students with a class",
        icon: BookOpen,
      },
      {
        label: "Without a Class",
        value: known(m.studentsWithoutClass.length),
        detail: "Active students awaiting assignment",
        icon: CircleAlert,
      },
    ]
  else if (view === "teachers")
    metrics = [
      {
        label: "Teacher Memberships",
        value: known(m.teachers.length),
        detail: "Loaded teacher accounts",
        icon: GraduationCap,
      },
      {
        label: "Active Teachers",
        value: known(m.activeTeachers.length),
        detail: "Active teaching memberships",
        icon: UserRoundCheck,
      },
      {
        label: "Without a Class",
        value: known(m.teachersWithoutClass.length),
        detail: "Active teachers without assignments",
        icon: BookOpen,
      },
      {
        label: "Teacher Invitations",
        value: known(
          m.invited.filter((v) => v.roles.includes("teacher")).length
        ),
        detail: "Invited teaching memberships",
        icon: Users,
      },
    ]
  else if (view === "enrollments")
    metrics = [
      {
        label: "Enrolled Students",
        value: known(m.enrolledStudents.length),
        detail: "Unique active students with a class",
        icon: Users,
      },
      {
        label: "Class Enrollments",
        value: m.enrollments.length,
        detail: "Unique student and class links",
        icon: UserRoundCheck,
      },
      {
        label: "Without a Class",
        value: known(m.studentsWithoutClass.length),
        detail: "Active student memberships",
        icon: CircleAlert,
      },
      {
        label: "School Classes",
        value: m.classes.length,
        detail: "Available enrollment destinations",
        icon: BookOpen,
      },
    ]
  else if (view === "roles")
    metrics = [
      {
        label: "Defined Roles",
        value: 3,
        detail: "Student, Teacher and Admin",
        icon: ShieldCheck,
      },
      {
        label: "Admin Memberships",
        value: known(m.members.filter((v) => v.roles.includes("admin")).length),
        detail: "Privileged school access",
        icon: Users,
      },
      {
        label: "Multiple Roles",
        value: known(m.members.filter((v) => v.roles.length > 1).length),
        detail: "Memberships with multiple work contexts",
        icon: UserRoundCheck,
      },
      {
        label: "Suspended Memberships",
        value: known(m.suspended.length),
        detail: "School access is suspended",
        icon: CircleAlert,
      },
    ]
  else if (view === "users")
    metrics = [
      {
        label: "School Memberships",
        value: known(m.members.length),
        detail: "Loaded membership records",
        icon: Users,
      },
      {
        label: "Active Memberships",
        value: known(m.members.filter((v) => v.status === "active").length),
        detail: "Current school access",
        icon: UserRoundCheck,
      },
      {
        label: "Pending Invitations",
        value: known(m.invited.length),
        detail: "Invited memberships",
        icon: GraduationCap,
      },
      {
        label: "Suspended Memberships",
        value: known(m.suspended.length),
        detail: "Accounts needing access review",
        icon: ShieldCheck,
      },
    ]
  else if (view === "timetable")
    metrics = [
      {
        label: "Today’s Lessons",
        value: slots(m.today.length),
        detail: "School time · Africa/Harare",
        icon: CalendarDays,
      },
      {
        label: "Without Active Teachers",
        value:
          m.timetableAvailable && m.peopleAvailable
            ? m.timetable.filter((t) =>
                m.unassignedClasses.some((c) => c.id === t.classId)
              ).length
            : null,
        detail: "Scheduled periods needing assignment",
        icon: GraduationCap,
      },
      {
        label: "Room Overlaps",
        value: slots(m.conflicts.filter((v) => v.type === "Room").length),
        detail: "Overlapping periods in the same room",
        icon: CircleAlert,
      },
      {
        label: "Teacher Overlaps",
        value: m.peopleAvailable
          ? slots(m.conflicts.filter((v) => v.type === "Teacher").length)
          : null,
        detail: "Overlapping assigned teaching periods",
        icon: Users,
      },
    ]
  else if (view === "audit")
    metrics = [
      {
        label: "Loaded Audit Events",
        value: m.auditAvailable ? m.audit.length : null,
        detail: "Most recent school activity",
        icon: ShieldCheck,
      },
      {
        label: "Membership Changes",
        value: m.auditAvailable
          ? m.audit.filter((v) => v.action.startsWith("member.")).length
          : null,
        detail: "Access and invitation activity",
        icon: Users,
      },
      {
        label: "Class Changes",
        value: m.auditAvailable
          ? m.audit.filter(
              (v) =>
                v.action.startsWith("class.") || v.action.startsWith("teacher.")
            ).length
          : null,
        detail: "Class and teacher assignments",
        icon: BookOpen,
      },
      {
        label: "Enrollment Changes",
        value: m.auditAvailable
          ? m.audit.filter((v) => v.action.startsWith("enrollment.")).length
          : null,
        detail: "Recorded class membership activity",
        icon: UserRoundCheck,
      },
    ]
  else if (title === "Finance")
    metrics = ["Collected", "Outstanding", "Overdue", "Payments Today"].map(
      (label) => ({
        label,
        value: null,
        detail: "Fee and payment records unavailable",
        icon: Wallet,
      })
    )
  else if (title === "Attendance exceptions")
    metrics = ["Today’s Attendance", "Absent", "Late", "Unmarked Classes"].map(
      (label) => ({
        label,
        value: null,
        detail: "Attendance records unavailable",
        icon: ClipboardCheck,
      })
    )
  else if (title === "Staff and HR")
    metrics = [
      {
        label: "Teacher Accounts",
        value: known(m.teachers.length),
        detail: "Teaching memberships, not an HR roster",
        icon: GraduationCap,
      },
      {
        label: "Admin Accounts",
        value: known(m.members.filter((v) => v.roles.includes("admin")).length),
        detail: "Administration access memberships",
        icon: ShieldCheck,
      },
      {
        label: "Staff Attendance",
        value: null,
        detail: "Staff records unavailable",
        icon: ClipboardCheck,
      },
      {
        label: "Leave Requests",
        value: null,
        detail: "Leave records unavailable",
        icon: CalendarDays,
      },
    ]
  if (!metrics.length) return null
  return (
    <div className={styles.metrics} aria-label="Page summary">
      {metrics.map((v) => (
        <AdminMetricCard key={v.label} {...v} />
      ))}
    </div>
  )
}
export function AdminRoleDefinitions() {
  return (
    <AdminSectionCard title="Role definitions">
      <div className={styles.catalogue}>
        {(["student", "teacher", "admin"] as const).map((role) => (
          <article className={styles.classCard} key={role}>
            <h3 className="capitalize">{role}</h3>
            <p>{roleCapabilities[role].length} defined capabilities</p>
            <details className="mt-3 text-xs">
              <summary className="min-h-10 cursor-pointer py-2">
                View capabilities
              </summary>
              <ul className="space-y-2 break-words">
                {roleCapabilities[role].map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
      <p className={styles.note}>
        Role changes require explicit confirmation in a member’s access
        settings. School membership and server authorization determine access.
      </p>
    </AdminSectionCard>
  )
}
export function AdminClassDetail({ id }: { id: string }) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const c = m.classes.find((v) => v.id === id)
  if (!c)
    return (
      <AdminEmptyState title="This class is not available">
        Return to Classes to choose a record you can access.
      </AdminEmptyState>
    )
  const learners = m.enrollments.filter((e) => e.classId === id)
  const teachers = m.teaching.filter((e) => e.classId === id)
  return (
    <div className={styles.page}>
      <AdminSectionCard title={c.name}>
        <p className={styles.note}>
          {c.subject || "Subject not specified"} ·{" "}
          {c.yearLevel || "Level not specified"}
        </p>
        <div className={styles.actions}>
          <AdminLink
            href="/admin/classes#assign-teacher"
            capability="classes.manage"
          >
            Assign teacher
          </AdminLink>
          <AdminLink
            href={`/admin/enrollments?class=${id}`}
            capability="enrollments.manage"
          >
            Manage enrollment
          </AdminLink>
          <AdminLink
            href={`/admin/timetable?class=${id}`}
            capability="timetable.view"
          >
            Open timetable
          </AdminLink>
        </div>
      </AdminSectionCard>
      <div className={styles.twoColumns}>
        <AdminSectionCard title="Teaching assignments">
          {teachers.length ? (
            <ul className={styles.list}>
              {teachers.map((t) => (
                <AdminListRow
                  key={t.memberId}
                  title={
                    m.members.find((v) => v.id === t.memberId)?.name ??
                    "Teacher membership"
                  }
                  detail={
                    m.members.find((v) => v.id === t.memberId)?.status ??
                    "Membership details unavailable"
                  }
                  href={`/admin/users/${t.memberId}`}
                  capability="users.manage"
                />
              ))}
            </ul>
          ) : (
            <AdminEmptyState title="No teacher assigned">
              Assign an active teacher from Classes.
            </AdminEmptyState>
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Scheduled lessons">
          {m.timetable.filter((t) => t.classId === id).length ? (
            <ul className={styles.list}>
              {m.timetable
                .filter((t) => t.classId === id)
                .map((t) => (
                  <AdminListRow
                    key={t.id}
                    title={weekdays[t.weekday - 1]}
                    detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${t.room || "No room specified"}`}
                  />
                ))}
            </ul>
          ) : (
            <AdminEmptyState
              title={
                m.timetableAvailable
                  ? "No lessons scheduled"
                  : "Timetable unavailable"
              }
            >
              Lesson times appear when this class has an available timetable.
            </AdminEmptyState>
          )}
        </AdminSectionCard>
      </div>
      <AdminSectionCard title="Enrolled students">
        {learners.length ? (
          <ul className={styles.list}>
            {learners.map((e) => (
              <AdminListRow
                key={e.memberId}
                title={
                  m.members.find((v) => v.id === e.memberId)?.name ?? e.memberId
                }
                detail={
                  m.members.find((v) => v.id === e.memberId)?.status ??
                  "Membership details unavailable"
                }
                href={`/admin/users/${e.memberId}`}
                capability="users.manage"
              />
            ))}
          </ul>
        ) : (
          <AdminEmptyState title="No students enrolled">
            Add students using Enrollment.
          </AdminEmptyState>
        )}
      </AdminSectionCard>
      <AdminSectionCard title="Class assignments">
        {data.assignments.filter((a) => a.classId === id).length ? (
          <ul className={styles.list}>
            {data.assignments
              .filter((a) => a.classId === id)
              .map((a) => (
                <AdminListRow
                  key={a.id}
                  title={a.title}
                  detail={
                    a.dueAt ? `Due ${schoolDate(a.dueAt)}` : "No deadline set"
                  }
                >
                  <AdminStatusBadge status={a.status} />
                </AdminListRow>
              ))}
          </ul>
        ) : (
          <AdminEmptyState title="No class assignments">
            Published or draft assignments will appear when teachers add
            coursework.
          </AdminEmptyState>
        )}
      </AdminSectionCard>
    </div>
  )
}
export function AdminTimetable() {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const [period, setPeriod] = useState("week")
  const params = useSearchParams()
  const [classId, setClassId] = useState(
    m.classes.some((c) => c.id === params.get("class"))
      ? params.get("class")!
      : "all"
  )
  const [teacherId, setTeacherId] = useState("all")
  const rows = m.timetable.filter(
    (t) =>
      (period === "week" || t.weekday === m.weekday) &&
      (classId === "all" || t.classId === classId) &&
      (teacherId === "all" ||
        m.teaching.some(
          (v) => v.classId === t.classId && v.memberId === teacherId
        ))
  )
  return (
    <div className={styles.page}>
      <AdminSectionCard title="School timetable">
        <div className={styles.toolbar}>
          <div>
            <Label htmlFor="admin-timetable-view">Timetable view</Label>
            <select
              id="admin-timetable-view"
              className="iskool-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Whole week</option>
              <option value="today">Today</option>
            </select>
          </div>
          <div>
            <Label htmlFor="admin-timetable-class">Class</Label>
            <select
              id="admin-timetable-class"
              className="iskool-select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="all">All classes</option>
              {m.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="admin-timetable-teacher">Teacher</Label>
            <select
              id="admin-timetable-teacher"
              className="iskool-select"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="all">All teachers</option>
              {m.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className={styles.note}>
          School time · Africa/Harare · recurring weekly lessons
        </p>
        {!m.timetableAvailable && (
          <AdminEmptyState title="Timetable temporarily unavailable">
            Reload this page to try again.
            <AdminRetry />
          </AdminEmptyState>
        )}
      </AdminSectionCard>
      {m.timetableAvailable && (
        <div className={styles.catalogue}>
          {weekdays
            .filter((_, i) => period === "week" || i + 1 === m.weekday)
            .map((day) => (
              <AdminSectionCard
                key={day}
                title={`${day}${weekdays[m.weekday - 1] === day ? " · Today" : ""}`}
              >
                {rows.filter((t) => weekdays[t.weekday - 1] === day).length ? (
                  <ul className={styles.list}>
                    {rows
                      .filter((t) => weekdays[t.weekday - 1] === day)
                      .map((t) => (
                        <AdminListRow
                          key={t.id}
                          title={
                            m.classes.find((c) => c.id === t.classId)?.name ??
                            "Class"
                          }
                          detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${t.room || "No room specified"}`}
                          href={`/admin/classes/${t.classId}`}
                          capability="classes.view"
                        />
                      ))}
                  </ul>
                ) : (
                  <p className={styles.note}>No lessons match these filters.</p>
                )}
              </AdminSectionCard>
            ))}
        </div>
      )}
      {m.timetableAvailable && (
        <AdminSectionCard title="Schedule overlaps">
          {m.conflicts.length ? (
            <ul className={styles.list}>
              {m.conflicts.map((v, i) => {
                const first = m.timetable.find((t) => t.id === v.first)!,
                  second = m.timetable.find((t) => t.id === v.second)!
                return (
                  <AdminListRow
                    key={i}
                    title={`${v.type} overlap · ${weekdays[first.weekday - 1]}`}
                    detail={`${m.classes.find((c) => c.id === first.classId)?.name} (${first.start.slice(0, 5)}–${first.end.slice(0, 5)}) and ${m.classes.find((c) => c.id === second.classId)?.name} (${second.start.slice(0, 5)}–${second.end.slice(0, 5)})`}
                  />
                )
              })}
            </ul>
          ) : (
            <AdminEmptyState
              title="No overlaps found in loaded periods"
              icon={CalendarDays}
            >
              Room and teacher overlap checks cover the timetable periods
              available in this workspace.
            </AdminEmptyState>
          )}
        </AdminSectionCard>
      )}
    </div>
  )
}
export function AdminAudit() {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("all")
  const [actor, setActor] = useState("all")
  const [date, setDate] = useState("")
  const dayKey = (instant: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Harare",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(instant))
  const rows = m.audit.filter(
    (a) =>
      `${a.action} ${a.actor}`.toLowerCase().includes(query.toLowerCase()) &&
      (action === "all" || a.action === action) &&
      (actor === "all" || a.actor === actor) &&
      (!date || dayKey(a.at) === date)
  )
  return (
    <AdminSectionCard title="Audit events">
      <div className={styles.toolbar}>
        <div>
          <Label htmlFor="audit-search">Search audit events</Label>
          <Input
            id="audit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Action or actor"
          />
        </div>
        <div>
          <Label htmlFor="audit-action">Action</Label>
          <select
            id="audit-action"
            className="iskool-select"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="all">All actions</option>
            {[...new Set(m.audit.map((a) => a.action))].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="audit-actor">Actor</Label>
          <select
            id="audit-actor"
            className="iskool-select"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          >
            <option value="all">All actors</option>
            {[...new Set(m.audit.map((a) => a.actor))].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="audit-date">School-local date</Label>
          <Input
            id="audit-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      {!m.auditAvailable ? (
        <AdminEmptyState title="Audit history unavailable">
          Reload this page to try again.
          <AdminRetry />
        </AdminEmptyState>
      ) : rows.length ? (
        <div
          className={styles.tableScroll}
          role="region"
          aria-label="Audit history"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption className="sr-only">
              School audit events, latest first
            </caption>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Actor</th>
                <th scope="col">Time · Africa/Harare</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.actor}</td>
                  <td>
                    <time dateTime={a.at}>
                      {schoolDate(a.at, {
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmptyState
          title="No activity matches the selected filters"
          icon={ShieldCheck}
        >
          Clear the filters to view available audit events. New school changes
          will appear here when recorded.
        </AdminEmptyState>
      )}
    </AdminSectionCard>
  )
}
const reportCatalogue: {
  title: string
  description: string
  href?: string
  capability: Capability
  icon: typeof Users
}[] = [
  {
    title: "Student Summary",
    description: "View student memberships and current class enrollment.",
    href: "/admin/students",
    capability: "students.manage",
    icon: Users,
  },
  {
    title: "Teacher Summary",
    description: "View teaching memberships and class assignments.",
    href: "/admin/teachers",
    capability: "users.manage",
    icon: GraduationCap,
  },
  {
    title: "Enrollment Overview",
    description: "Review current student and class links.",
    href: "/admin/enrollments",
    capability: "enrollments.manage",
    icon: UserRoundCheck,
  },
  {
    title: "Audit Activity",
    description: "Review recorded school administrative changes.",
    href: "/admin/audit",
    capability: "audit.view",
    icon: ShieldCheck,
  },
  {
    title: "Academic Performance",
    description: "Academic report generation is not available yet.",
    capability: "reports.view",
    icon: BookOpen,
  },
  {
    title: "Attendance Report",
    description: "Attendance records and exports are not available yet.",
    capability: "attendance.manage",
    icon: ClipboardCheck,
  },
  {
    title: "Fee Collection Report",
    description: "Finance records and exports are not available yet.",
    capability: "finance.view",
    icon: Wallet,
  },
  {
    title: "Staff and HR Report",
    description: "Staff and leave reports are not available yet.",
    capability: "staff.manage",
    icon: Users,
  },
]
export function AdminReports() {
  const caps = useAdminAccess()
  const [query, setQuery] = useState("")
  const reports = reportCatalogue.filter(
    (r) =>
      hasCapability(caps, r.capability) &&
      `${r.title} ${r.description}`.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className={styles.page}>
      <AdminSectionCard title="Report catalogue">
        <div>
          <Label htmlFor="report-search">Search reports</Label>
          <Input
            id="report-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Students, enrollment, attendance…"
          />
        </div>
        <p className={styles.note}>
          Open available records below. Downloadable report generation is not
          available yet.
        </p>
        <div className={styles.catalogue}>
          {reports.map(({ icon: Icon, ...r }) => (
            <article key={r.title} className={styles.classCard}>
              <span className={styles.icon}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-4">{r.title}</h3>
              <p>{r.description}</p>
              {r.href ? (
                <div className={styles.actions}>
                  <AdminLink href={r.href} capability={r.capability}>
                    Open records
                  </AdminLink>
                </div>
              ) : (
                <span className={`${styles.badge} mt-4`}>Unavailable</span>
              )}
            </article>
          ))}
        </div>
        {!reports.length && (
          <AdminEmptyState title="No reports match this search">
            Try a category such as Students or Attendance.
          </AdminEmptyState>
        )}
      </AdminSectionCard>
      <AdminSectionCard title="Generated reports">
        <AdminEmptyState
          title="Report generation is not available yet"
          icon={FileBarChart}
        >
          Generated documents and their status will appear once the school
          reporting service is available.
        </AdminEmptyState>
      </AdminSectionCard>
    </div>
  )
}
export function AdminOperations({ title }: { title: string }) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  if (title === "Finance")
    return (
      <div className={styles.twoColumns}>
        <FeeCollectionCard />
        {[
          {
            title: "Recent Payments",
            empty: "Payment records are not available yet",
            description:
              "Confirmed payments, references and methods will appear when school payment records are available.",
          },
          {
            title: "Outstanding Balances",
            empty: "Balance records are not available yet",
            description:
              "Student balances will appear when invoices and payments are available.",
          },
          {
            title: "Fee Follow-up",
            empty: "Fee follow-up is not available yet",
            description:
              "Overdue balances cannot be identified until billing records are available.",
          },
        ].map((v) => (
          <AdminSectionCard key={v.title} title={v.title}>
            <AdminEmptyState title={v.empty} icon={Wallet}>
              {v.description}
            </AdminEmptyState>
          </AdminSectionCard>
        ))}
      </div>
    )
  if (title === "Attendance exceptions")
    return (
      <div className={styles.page}>
        <div className={styles.twoColumns}>
          <AdminSectionCard title="Attendance exceptions">
            <AdminEmptyState
              title="Attendance records are not available yet"
              icon={ClipboardCheck}
            >
              Absence, lateness and class marking status will appear when the
              school attendance service is available.
            </AdminEmptyState>
          </AdminSectionCard>
          <AdminSectionCard title="Attendance records">
            <AdminEmptyState
              title="No attendance register is available"
              icon={Users}
            >
              Attendance cannot be recorded or exported from this workspace yet.
            </AdminEmptyState>
          </AdminSectionCard>
        </div>
        <AdminSectionCard
          title="Today’s scheduled classes"
          href="/admin/timetable"
          capability="timetable.view"
          action="Timetable"
        >
          {m.timetableAvailable && m.today.length ? (
            <ul className={styles.list}>
              {m.today.map((t) => (
                <AdminListRow
                  key={t.id}
                  title={
                    m.classes.find((c) => c.id === t.classId)?.name ?? "Class"
                  }
                  detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${t.room || "No room specified"}`}
                  href={`/admin/classes/${t.classId}`}
                  capability="classes.view"
                />
              ))}
            </ul>
          ) : (
            <p className={styles.note}>
              {m.timetableAvailable
                ? "No lessons scheduled today."
                : "The timetable is temporarily unavailable."}
            </p>
          )}
          <p className={styles.note}>
            A scheduled lesson does not indicate that attendance was marked.
          </p>
        </AdminSectionCard>
      </div>
    )
  if (title === "Staff and HR")
    return (
      <div className={styles.page}>
        <div className={styles.twoColumns}>
          <AdminSectionCard title="Staff profiles">
            <AdminEmptyState
              title="HR staff records are not available yet"
              icon={Users}
            >
              Department, contact and employment details will appear when the
              school staff service is available.
            </AdminEmptyState>
          </AdminSectionCard>
          <AdminSectionCard title="Leave requests">
            <AdminEmptyState
              title="Leave records are not available yet"
              icon={CalendarDays}
            >
              Pending requests and approved leave will appear when the school
              leave service is available.
            </AdminEmptyState>
          </AdminSectionCard>
        </div>
        <AdminSectionCard title="Teaching and administration accounts">
          <p className={styles.note}>
            Available school access memberships. This is not an employment
            roster.
          </p>
          {m.peopleAvailable ? (
            <ul className={styles.list}>
              {m.members
                .filter(
                  (v) =>
                    v.roles.includes("teacher") || v.roles.includes("admin")
                )
                .map((v) => (
                  <AdminListRow
                    key={v.id}
                    title={v.name}
                    detail={`${v.roles.join(", ")} · ${v.status}`}
                    href={`/admin/users/${v.id}`}
                    capability="users.manage"
                  />
                ))}
            </ul>
          ) : (
            <AdminEmptyState title="Membership records unavailable">
              Reload to try again.
            </AdminEmptyState>
          )}
        </AdminSectionCard>
      </div>
    )
  return (
    <AdminSectionCard title="School configuration">
      <AdminEmptyState title="School configuration is not available yet">
        School-wide settings will appear when configuration services are
        available.
      </AdminEmptyState>
      <div className={styles.actions}>
        <AdminLink href="/settings/account" capability="settings.manage">
          Open account and appearance settings
        </AdminLink>
      </div>
    </AdminSectionCard>
  )
}
export { AdmissionsPipelineCard }
