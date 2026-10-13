"use client"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Users, GraduationCap, BookOpen, Search } from "lucide-react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AdminSectionCard,
  AdminEmptyState,
  AdminStatusBadge,
  AdminLink,
  AdminListRow,
  AdminRetry,
} from "./admin-components"
import { adminModel } from "./model"
import styles from "./admin-workspace.module.css"

export function AdminPeopleRecords({
  kind,
}: {
  kind: "users" | "students" | "teachers" | "roles"
}) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const params = useSearchParams()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(params.get("status") ?? "all")
  const [role, setRole] = useState("all")
  const [classId, setClassId] = useState("all")
  const [enrollment, setEnrollment] = useState(
    params.get("enrollment") ?? "all"
  )
  const source =
    kind === "students"
      ? m.students
      : kind === "teachers"
        ? m.teachers
        : m.members
  const links =
    kind === "teachers"
      ? m.teaching
      : kind === "students"
        ? m.enrollments
        : [...m.enrollments, ...m.teaching]
  const classesFor = (id: string) =>
    m.classes
      .filter((c) => links.some((e) => e.memberId === id && e.classId === c.id))
      .map((c) => c.name)
  const rows = source.filter(
    (member) =>
      `${member.name} ${member.id} ${member.roles.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || member.status === status) &&
      (role === "all" ||
        member.roles.includes(role as "student" | "teacher" | "admin")) &&
      (classId === "all" ||
        links.some((e) => e.memberId === member.id && e.classId === classId)) &&
      (enrollment === "all" ||
        (enrollment === "enrolled"
          ? links.some((e) => e.memberId === member.id)
          : !links.some((e) => e.memberId === member.id)))
  )
  const title =
    kind === "roles"
      ? "Membership roles"
      : kind[0].toUpperCase() + kind.slice(1)
  return (
    <AdminSectionCard title={title}>
      <div className={styles.toolbar}>
        <div>
          <Label htmlFor={`admin-search-${kind}`}>
            Search {kind === "roles" ? "roles and access" : kind}
          </Label>
          <Input
            id={`admin-search-${kind}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or membership ID"
          />
        </div>
        <div>
          <Label htmlFor={`admin-status-${kind}`}>Membership status</Label>
          <select
            id={`admin-status-${kind}`}
            className="iskool-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        {(kind === "users" || kind === "roles") && (
          <div>
            <Label htmlFor={`admin-role-${kind}`}>Role</Label>
            <select
              id={`admin-role-${kind}`}
              className="iskool-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="all">All roles</option>
              {["student", "teacher", "admin"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
        {(kind === "students" || kind === "teachers") && (
          <>
            <div>
              <Label htmlFor={`admin-class-${kind}`}>Class</Label>
              <select
                id={`admin-class-${kind}`}
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
              <Label htmlFor={`admin-enrollment-${kind}`}>
                {kind === "teachers" ? "Teaching assignment" : "Enrollment"}
              </Label>
              <select
                id={`admin-enrollment-${kind}`}
                className="iskool-select"
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
              >
                <option value="all">All records</option>
                <option value="enrolled">
                  {kind === "teachers" ? "Assigned" : "Enrolled"}
                </option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </>
        )}
      </div>
      <p role="status" className={styles.note}>
        {m.peopleAvailable
          ? `${rows.length} matching ${kind === "roles" ? "memberships" : kind} · ${source.length} loaded records`
          : "People could not be loaded. Retry to view school memberships."}
      </p>
      {!m.peopleAvailable ? (
        <AdminEmptyState
          title="People are temporarily unavailable"
          icon={Users}
        >
          Reload this page to try again. No membership changes have been made.
          <AdminRetry />
        </AdminEmptyState>
      ) : !rows.length ? (
        <AdminEmptyState title="No matching memberships" icon={Search}>
          Clear the filters to see available school records.
        </AdminEmptyState>
      ) : (
        <>
          <div
            className={`${styles.tableScroll} ${styles.desktopRecords}`}
            role="region"
            aria-label={`${title} table`}
            tabIndex={0}
          >
            <table className={styles.table}>
              <caption className="sr-only">
                {title} in the current school workspace
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name / membership</th>
                  <th scope="col">Roles</th>
                  <th scope="col">Status</th>
                  <th scope="col">Classes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <AdminLink
                        href={`/admin/users/${member.id}`}
                        capability="users.manage"
                      >
                        {member.name}
                      </AdminLink>
                      <p>{member.id}</p>
                    </td>
                    <td>{member.roles.join(", ") || "No roles"}</td>
                    <td>
                      <AdminStatusBadge status={member.status} />
                    </td>
                    <td>
                      {classesFor(member.id).join(", ") || "None assigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={`${styles.list} ${styles.mobileRecords}`}>
            {rows.map((member) => (
              <AdminListRow
                key={member.id}
                title={member.name}
                detail={`${member.roles.join(", ")} · ${member.id} · ${classesFor(member.id).join(", ") || "No class assigned"}`}
                href={`/admin/users/${member.id}`}
                capability="users.manage"
              >
                <AdminStatusBadge status={member.status} />
              </AdminListRow>
            ))}
          </ul>
        </>
      )}
    </AdminSectionCard>
  )
}
export function AdminClassRecords({
  enrollment = false,
  onSelectClass,
}: {
  enrollment?: boolean
  onSelectClass?: (id: string) => void
}) {
  const { data } = useWorkspace()
  const m = adminModel(data)
  const params = useSearchParams()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(params.get("assignment") ?? "all")
  const [classId, setClassId] = useState(
    m.classes.some((c) => c.id === params.get("class"))
      ? params.get("class")!
      : "all"
  )
  const records = m.enrollments.filter(
    (e) =>
      (classId === "all" || e.classId === classId) &&
      `${m.members.find((v) => v.id === e.memberId)?.name ?? e.memberId} ${m.classes.find((v) => v.id === e.classId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  const classes = m.classes.filter(
    (c) =>
      `${c.name} ${c.subject} ${c.yearLevel}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || m.unassignedClasses.some((v) => v.id === c.id))
  )
  return (
    <AdminSectionCard
      title={enrollment ? "Current enrollment" : "School classes"}
    >
      <div className={styles.toolbar}>
        <div>
          <Label htmlFor="admin-class-search">
            Search {enrollment ? "enrollment" : "school classes"}
          </Label>
          <Input
            id="admin-class-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              enrollment ? "Student or class" : "Class name or subject"
            }
          />
        </div>
        <div>
          <Label htmlFor="admin-class-filter">
            {enrollment ? "Class" : "Teacher assignment"}
          </Label>
          <select
            id="admin-class-filter"
            className="iskool-select"
            value={enrollment ? classId : filter}
            onChange={(e) =>
              enrollment
                ? setClassId(e.target.value)
                : setFilter(e.target.value)
            }
          >
            <option value="all">
              {enrollment ? "All classes" : "All assignments"}
            </option>
            {enrollment ? (
              m.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            ) : (
              <option value="unassigned">Without an active teacher</option>
            )}
          </select>
        </div>
      </div>
      {enrollment ? (
        records.length ? (
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Enrollment records"
            tabIndex={0}
          >
            <table className={styles.table}>
              <caption className="sr-only">
                Current student class enrollment
              </caption>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Class</th>
                  <th scope="col">Membership status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((e) => (
                  <tr key={`${e.classId}:${e.memberId}`}>
                    <td>
                      <AdminLink
                        href={`/admin/users/${e.memberId}`}
                        capability="users.manage"
                      >
                        {m.members.find((v) => v.id === e.memberId)?.name ??
                          e.memberId}
                      </AdminLink>
                    </td>
                    <td>
                      <AdminLink
                        href={`/admin/classes/${e.classId}`}
                        capability="classes.view"
                      >
                        {m.classes.find((v) => v.id === e.classId)?.name}
                      </AdminLink>
                    </td>
                    <td>
                      <AdminStatusBadge
                        status={
                          m.members.find((v) => v.id === e.memberId)?.status ??
                          "Unavailable"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="No matching enrollments">
            Clear the filters, or use the enrollment form to assign a student to
            a class.
          </AdminEmptyState>
        )
      ) : classes.length ? (
        <div className={styles.classGrid}>
          {classes.map((c) => {
            const teachers = m.teaching
              .filter((t) => t.classId === c.id)
              .map(
                (t) =>
                  m.members.find((v) => v.id === t.memberId)?.name ??
                  `Membership ${t.memberId}`
              )
            return (
              <article key={c.id} className={styles.classCard}>
                <h3>
                  <AdminLink
                    href={`/admin/classes/${c.id}`}
                    capability="classes.view"
                  >
                    {c.name}
                  </AdminLink>
                </h3>
                <p>
                  {c.subject || "Subject not specified"} ·{" "}
                  {c.yearLevel || "Level not specified"}
                </p>
                <dl>
                  <div>
                    <dt>Enrolled students</dt>
                    <dd>
                      {m.enrollments.filter((e) => e.classId === c.id).length}
                    </dd>
                  </div>
                  <div>
                    <dt>Timetable</dt>
                    <dd>
                      {m.timetableAvailable
                        ? `${m.timetable.filter((t) => t.classId === c.id).length} weekly lessons`
                        : "Unavailable"}
                    </dd>
                  </div>
                </dl>
                <p>
                  <GraduationCap
                    className="mr-1 inline"
                    size={14}
                    aria-hidden="true"
                  />
                  {m.peopleAvailable
                    ? teachers.join(", ") || "No teacher assigned"
                    : "Teacher records unavailable"}
                </p>
                <div className={styles.actions}>
                  <AdminLink
                    href={`/admin/classes/${c.id}`}
                    capability="classes.view"
                  >
                    Open class
                  </AdminLink>
                  <AdminLink
                    href="#assign-teacher"
                    capability="classes.manage"
                    onClick={() => onSelectClass?.(c.id)}
                  >
                    Assign teacher
                  </AdminLink>
                  <AdminLink
                    href={`/admin/enrollments?class=${c.id}`}
                    capability="enrollments.manage"
                  >
                    Enrollment
                  </AdminLink>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <AdminEmptyState title="No matching classes" icon={BookOpen}>
          Clear the filter, or create a school class using the form below.
        </AdminEmptyState>
      )}
    </AdminSectionCard>
  )
}
