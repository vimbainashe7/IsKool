"use client"
import { useState } from "react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { PermissionState } from "@/components/feedback/state-views"
import { hasCapability, type RoleKey } from "@/lib/permissions/capabilities"
import {
  AdminPeopleRecords,
  AdminClassRecords,
} from "@/features/admin-workspace/admin-records"
import {
  AdminSectionCard,
  AdminEmptyState,
  AdminListRow,
  useAdminAccess,
} from "@/features/admin-workspace/admin-components"
import styles from "@/features/admin-workspace/admin-workspace.module.css"
import { useSearchParams } from "next/navigation"
export function AdminPeople({
  kind,
  memberId,
}: {
  kind: "users" | "students" | "teachers" | "roles"
  memberId?: string
}) {
  const { data: w, mutate, busy } = useWorkspace()
  const capabilities = useAdminAccess()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [inviteRole, setInviteRole] = useState<RoleKey>("student")
  const [status, setStatus] = useState("")
  const member = memberId ? w.members.find((m) => m.id === memberId) : undefined
  const [editStatus, setEditStatus] = useState(member?.status ?? "active")
  const [roles, setRoles] = useState<RoleKey[]>(member?.roles ?? [])
  if (memberId && !member)
    return (
      <PermissionState
        title="This person is not available"
        description="Return to user management to see records you can access."
      />
    )
  if (member)
    return (
      <div className={styles.profile}>
        <AdminSectionCard title="Profile and membership">
          <h2 className="text-xl font-semibold">{member.name}</h2>
          <p>
            Membership status: {member.status} · Roles:{" "}
            {member.roles.join(", ")}
          </p>
          <p>
            Classes:{" "}
            {w.classes
              .filter(
                (c) =>
                  w.enrollments.some(
                    (e) => e.classId === c.id && e.memberId === member.id
                  ) ||
                  w.teachers.some(
                    (t) => t.classId === c.id && t.memberId === member.id
                  )
              )
              .map((c) => c.name)
              .join(", ") || "None assigned"}
          </p>
          <p className="text-sm text-muted-foreground">
            Guardian/contact and term history are awaiting school record
            services.
          </p>
        </AdminSectionCard>
        <AdminSectionCard title="Manage access">
          <fieldset className="space-y-3 rounded-xl border p-4">
            <legend>Roles and access</legend>
            {(["student", "teacher", "admin"] as const).map((role) => (
              <label
                key={role}
                className="flex min-h-11 items-center gap-3 capitalize"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) =>
                    setRoles((old) =>
                      e.target.checked
                        ? [...old, role]
                        : old.filter((r) => r !== role)
                    )
                  }
                />
                {role}
              </label>
            ))}
            <Label htmlFor="membership-status">Membership status</Label>
            <select
              id="membership-status"
              className="iskool-select"
              value={editStatus}
              onChange={(e) =>
                setEditStatus(e.target.value as typeof editStatus)
              }
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="invited">Invited</option>
            </select>
          </fieldset>
          <ConfirmAction
            label="Save roles and access"
            description={`Change ${member.name} to ${editStatus} with roles ${roles.join(", ") || "none"}? This changes their school access.`}
            disabled={
              busy ||
              !roles.length ||
              w.mode !== "demo" ||
              !hasCapability(capabilities, "roles.manage")
            }
            onConfirm={async () => {
              await mutate({
                action: "member.update",
                memberId: member.id,
                status: editStatus,
                roles,
              })
              setStatus("Access change confirmed.")
            }}
          />
          {status && <p role="status">{status}</p>}
        </AdminSectionCard>
        {hasCapability(capabilities, "audit.view") && (
          <AdminSectionCard title="School access activity">
            <p className={styles.note}>
              Recent school-wide access changes. These records do not identify
              the affected membership.
            </p>
            {w.audit.some((a) => a.action.startsWith("member.")) ? (
              <ul className={styles.list}>
                {w.audit
                  .filter((a) => a.action.startsWith("member."))
                  .slice(0, 10)
                  .map((a) => (
                    <AdminListRow
                      key={a.id}
                      title={a.action}
                      detail={`${a.actor} · ${a.at}`}
                    />
                  ))}
              </ul>
            ) : (
              <AdminEmptyState title="No access changes available">
                School access activity will appear when audit events are
                available.
              </AdminEmptyState>
            )}
          </AdminSectionCard>
        )}
      </div>
    )
  return (
    <div className={styles.management}>
      <AdminPeopleRecords kind={kind} />
      {kind === "users" && (
        <section
          id="invite-member"
          className="max-w-2xl space-y-3 rounded-xl border p-5"
        >
          <h2 className="text-xl font-semibold">Invite a school member</h2>
          <Label htmlFor="invite-name">Full name</Label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Label htmlFor="invite-role">Trusted role to provision</Label>
          <select
            id="invite-role"
            className="iskool-select"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as RoleKey)}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <ConfirmAction
            label="Invite member"
            description={`Invite ${email} with ${inviteRole} access?`}
            disabled={
              busy ||
              name.trim().length < 2 ||
              !email.includes("@") ||
              !hasCapability(capabilities, "users.manage") ||
              w.mode !== "demo"
            }
            onConfirm={async () => {
              await mutate({
                action: "member.invite",
                name,
                email,
                role: inviteRole,
              })
              setName("")
              setEmail("")
              setStatus(
                "Invitation recorded in the preview. No email was sent."
              )
            }}
          />
          {status && <p role="status">{status}</p>}
        </section>
      )}
    </div>
  )
}
export function AdminClasses({ enrollment = false }: { enrollment?: boolean }) {
  const { data: w, mutate, busy } = useWorkspace()
  const capabilities = useAdminAccess()
  const params = useSearchParams()
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [year, setYear] = useState("")
  const [classId, setClassId] = useState(
    w.classes.some((c) => c.id === params.get("class"))
      ? params.get("class")!
      : (w.classes[0]?.id ?? "")
  )
  const [memberId, setMemberId] = useState(
    w.members.find((m) => m.roles.includes(enrollment ? "student" : "teacher"))
      ?.id ?? ""
  )
  const [notice, setNotice] = useState("")
  return (
    <div
      className={`${styles.management} ${!enrollment ? styles.classManagement : ""}`}
    >
      <AdminClassRecords enrollment={enrollment} onSelectClass={setClassId} />
      {!enrollment && (
        <section
          id="create-class"
          className="max-w-2xl space-y-3 rounded-xl border p-5"
        >
          <h2 className="text-xl font-semibold">Create class</h2>
          <Label htmlFor="class-name">Class name</Label>
          <Input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Label htmlFor="class-subject">Subject</Label>
          <Input
            id="class-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Label htmlFor="class-year">Year level</Label>
          <Input
            id="class-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <ConfirmAction
            label="Create class"
            description={`Create ${name} in the current school?`}
            disabled={
              name.trim().length < 2 ||
              busy ||
              w.mode !== "demo" ||
              !hasCapability(capabilities, "classes.manage")
            }
            onConfirm={async () => {
              await mutate({
                action: "class.save",
                name,
                subject,
                yearLevel: year,
              })
              setName("")
              setNotice("Class created.")
            }}
          />
        </section>
      )}
      <section
        id="assign-teacher"
        className="max-w-2xl space-y-3 rounded-xl border p-5"
      >
        <h2 className="text-xl font-semibold">
          {enrollment ? "Enroll student" : "Assign teacher"}
        </h2>
        <Label htmlFor="operation-class">Class</Label>
        <select
          id="operation-class"
          className="iskool-select"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          {w.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Label htmlFor="operation-member">
          {enrollment ? "Student" : "Teacher"}
        </Label>
        <select
          id="operation-member"
          className="iskool-select"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          {w.members
            .filter(
              (m) =>
                m.roles.includes(enrollment ? "student" : "teacher") &&
                m.status === "active"
            )
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
        <ConfirmAction
          label={
            enrollment ? "Confirm enrollment" : "Confirm teacher assignment"
          }
          description={`${enrollment ? "Enroll" : "Assign"} ${w.members.find((m) => m.id === memberId)?.name ?? "this member"} ${enrollment ? "in" : "to"} ${w.classes.find((c) => c.id === classId)?.name ?? "this class"}?`}
          disabled={
            !classId ||
            !memberId ||
            busy ||
            w.mode !== "demo" ||
            !hasCapability(
              capabilities,
              enrollment ? "enrollments.manage" : "classes.manage"
            )
          }
          onConfirm={async () => {
            await mutate({
              action: enrollment ? "enrollment.save" : "teacher.assign",
              classId,
              memberId,
            })
            setNotice("Class membership change confirmed.")
          }}
        />
        <p className="text-sm text-muted-foreground">
          Term/year transfer and historical enrollment changes require school
          record services.
        </p>
      </section>
      {notice && <p role="status">{notice}</p>}
    </div>
  )
}
