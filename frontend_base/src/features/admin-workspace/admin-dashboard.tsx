"use client"
import {
  Users,
  UserRoundCheck,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import {
  AdminSectionCard,
  AdminMetricCard,
  AdminEmptyState,
  AdminLink,
  useAdminAccess,
} from "./admin-components"
import { adminModel, schoolDate } from "./model"
import styles from "./admin-workspace.module.css"
import { hasCapability } from "@/lib/permissions/capabilities"

export function AdminAttention() {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const caps = useAdminAccess()
  const signals = [
    {
      count: m.invited.length,
      label: "pending invitations",
      href: "/admin/users?status=invited",
      capability: "users.manage" as const,
    },
    {
      count: m.suspended.length,
      label: "suspended memberships",
      href: "/admin/users?status=suspended",
      capability: "users.manage" as const,
    },
    {
      count: m.studentsWithoutClass.length,
      label: "students without a class",
      href: "/admin/students?enrollment=unassigned",
      capability: "students.manage" as const,
    },
    {
      count: m.unassignedClasses.length,
      label: "classes without active teachers",
      href: "/admin/classes?assignment=unassigned",
      capability: "classes.manage" as const,
    },
  ].filter((s) => s.count && hasCapability(caps, s.capability))
  if (!m.peopleAvailable || !signals.length) return null
  return (
    <section className={styles.attention} aria-label="Needs attention">
      <h2>Needs attention</h2>
      {signals.map((s) => (
        <AdminLink key={s.label} href={s.href} capability={s.capability}>
          <strong>{s.count}</strong> {s.label}
          <ArrowUpRight size={12} aria-hidden="true" />
        </AdminLink>
      ))}
    </section>
  )
}
export function AdmissionsPipelineCard() {
  const { data } = useWorkspace()
  const m = adminModel(data)
  return (
    <AdminSectionCard
      title="Admissions Pipeline"
      href="/admin/enrollments"
      capability="enrollments.manage"
      action="Enrollment"
    >
      <AdminEmptyState
        title="Applications are not available yet"
        icon={UserRoundCheck}
      >
        Application stages and conversion are unavailable.
      </AdminEmptyState>
      {m.peopleAvailable && (
        <>
          <p className={styles.note}>
            Current enrollment · active student memberships
          </p>
          <div className={styles.snapshot}>
            <div className={styles.snapshotTotal}>
              <strong>{m.activeStudents.length}</strong>
              <span>active students</span>
            </div>
            <div className={styles.bars}>
              {[
                {
                  label: "Enrolled in a class",
                  value: m.enrolledStudents.length,
                },
                {
                  label: "Without a class",
                  value: m.studentsWithoutClass.length,
                },
              ].map((s, i) => (
                <div key={s.label}>
                  <div className={styles.barLabel}>
                    <span>{s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                  <div
                    className={`${styles.bar} ${i ? styles.gold : ""}`}
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: `${m.activeStudents.length ? (s.value / m.activeStudents.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminSectionCard>
  )
}
export function UpcomingEventsCard() {
  const { data } = useWorkspace()
  const m = adminModel(data)
  return (
    <AdminSectionCard
      title="Upcoming Events"
      href="/admin/timetable"
      capability="timetable.view"
      action="Timetable"
    >
      <AdminEmptyState
        title="School events are not available yet"
        icon={CalendarDays}
      >
        No school calendar is available.
      </AdminEmptyState>
      <p className={styles.note}>Today’s scheduled lessons · Africa/Harare</p>
      {!m.timetableAvailable ? (
        <p className={styles.note}>
          The timetable could not be loaded. Other school information is still
          available.
        </p>
      ) : m.today.length ? (
        <ul className={styles.list}>
          {m.today.slice(0, 2).map((t) => (
            <li key={t.id} className={styles.listItem}>
              <div className={styles.row}>
                <span className={styles.dateTile}>
                  <strong>
                    {schoolDate(data.asOf, {
                      day: "numeric",
                      month: undefined,
                    })}
                  </strong>
                  <span>
                    {schoolDate(data.asOf, { day: undefined, month: "short" })}
                  </span>
                </span>
                <div className={styles.rowText}>
                  <AdminLink
                    href={`/admin/classes/${t.classId}`}
                    capability="classes.view"
                  >
                    <strong>
                      {m.classes.find((c) => c.id === t.classId)?.name ??
                        "Class"}
                    </strong>
                  </AdminLink>
                  <p>
                    {t.start.slice(0, 5)} – {t.end.slice(0, 5)}
                    {t.room ? ` · ${t.room}` : ""}
                  </p>
                </div>
                <CalendarDays size={16} aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.note}>No lessons are scheduled today.</p>
      )}
    </AdminSectionCard>
  )
}
export function FeeCollectionCard() {
  return (
    <AdminSectionCard
      title="Fee Collection"
      href="/admin/finance"
      capability="finance.view"
      action="Finance"
    >
      <div className={styles.fees}>
        <div className={styles.ring} aria-hidden="true">
          <strong>—</strong>
          <span>No rate</span>
        </div>
        <dl className={styles.legend}>
          {["Collected", "Outstanding", "Overdue", "Total billed"].map(
            (label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>Unavailable</dd>
              </div>
            )
          )}
        </dl>
      </div>
      <p className={styles.note}>
        Fee records are not available yet. Collection rates and amounts will
        appear when billing and payments are connected.
      </p>
    </AdminSectionCard>
  )
}
const summaries = [
  {
    title: "Student Summary",
    detail: "Memberships & classes",
    href: "/admin/students",
    capability: "students.manage" as const,
    icon: Users,
  },
  {
    title: "Enrollment Overview",
    detail: "Current class enrollment",
    href: "/admin/enrollments",
    capability: "enrollments.manage" as const,
    icon: UserRoundCheck,
  },
  {
    title: "Teacher Summary",
    detail: "Teaching assignments",
    href: "/admin/teachers",
    capability: "users.manage" as const,
    icon: GraduationCap,
  },
  {
    title: "Audit Activity",
    detail: "School access changes",
    href: "/admin/audit",
    capability: "audit.view" as const,
    icon: ShieldCheck,
  },
]
export function ReportsOverviewCard() {
  const caps = useAdminAccess()
  return (
    <AdminSectionCard
      title="Reports Overview"
      href="/admin/reports"
      capability="reports.view"
      action="All reports"
    >
      <div className={styles.reports}>
        {summaries
          .filter((s) => hasCapability(caps, s.capability))
          .map(({ icon: Icon, ...s }) => (
            <AdminLink
              key={s.title}
              href={s.href}
              capability={s.capability}
              className={styles.report}
            >
              <span className={styles.icon}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.detail}</p>
              </div>
            </AdminLink>
          ))}
      </div>
      <p className={styles.note}>
        Open available school records. Downloadable reports are not available
        yet.
      </p>
    </AdminSectionCard>
  )
}
export function AdminDashboard({
  name,
  school,
}: {
  name: string
  school: string
}) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  return (
    <div className={`${styles.page} ${styles.dashboard}`}>
      <header className={`${styles.header} ${styles.welcome}`}>
        <div>
          <p className={styles.eyebrow}>Your school at a glance</p>
          <h1>
            <span className="sr-only">Admin dashboard. </span>Welcome back,{" "}
            {name.trim().split(/\s+/)[0] || "Admin"}
          </h1>
          <p>Here’s what needs your attention at {school} today.</p>
        </div>
        <time className={styles.date} dateTime={data.asOf}>
          {schoolDate(data.asOf, { weekday: "long" })}
        </time>
      </header>
      <div className={styles.metrics} aria-label="School summary">
        <AdminMetricCard
          label="Students"
          value={m.peopleAvailable ? m.students.length : null}
          detail={
            m.peopleAvailable
              ? `${m.activeStudents.length} active memberships`
              : "Student records could not be loaded"
          }
          icon={Users}
          href="/admin/students"
          capability="students.manage"
        />
        <AdminMetricCard
          label="Enrolled Students"
          value={m.peopleAvailable ? m.enrolledStudents.length : null}
          detail="Active students in at least one class"
          icon={UserRoundCheck}
          href="/admin/enrollments"
          capability="enrollments.manage"
        />
        <AdminMetricCard
          label="Teachers"
          value={m.peopleAvailable ? m.teachers.length : null}
          detail={
            m.peopleAvailable
              ? `${m.activeTeachers.length} active · ${m.teachersWithoutClass.length} unassigned`
              : "Teacher records could not be loaded"
          }
          icon={GraduationCap}
          href="/admin/teachers"
          capability="users.manage"
        />
        <AdminMetricCard
          label="Attendance"
          value={null}
          detail="Attendance records are not available yet"
          icon={ClipboardCheck}
          href="/admin/attendance"
          capability="attendance.manage"
        />
      </div>
      <AdminAttention />
      <div className={styles.operations}>
        <AdmissionsPipelineCard />
        <UpcomingEventsCard />
        <FeeCollectionCard />
        <ReportsOverviewCard />
      </div>
      <p className={styles.note}>
        Counts reflect the school records currently loaded in your workspace.
      </p>
    </div>
  )
}
