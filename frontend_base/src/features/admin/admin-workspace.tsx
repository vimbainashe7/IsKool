"use client"
import { useState } from "react"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { Records } from "@/features/workspace/records"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { PermissionState } from "@/components/feedback/state-views"
import type { RoleKey } from "@/lib/permissions/capabilities"
export function AdminPeople({
  kind,
  memberId,
}: {
  kind: "users" | "students" | "teachers" | "roles"
  memberId?: string
}) {
  const { data: w, mutate, busy } = useWorkspace()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [inviteRole, setInviteRole] = useState<RoleKey>("student")
  const [status, setStatus] = useState("")
  const members = w.members.filter((m) =>
    kind === "students"
      ? m.roles.includes("student")
      : kind === "teachers"
        ? m.roles.includes("teacher")
        : true
  )
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
      <section className="max-w-3xl space-y-5">
        <h2 className="text-xl font-semibold">{member.name}</h2>
        <p>
          Membership status: {member.status} · Roles: {member.roles.join(", ")}
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
          Guardian/contact and term history are awaiting school record services.
        </p>
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
            onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="invited">Invited</option>
          </select>
        </fieldset>
        <ConfirmAction
          label="Save roles and access"
          description={`Change ${member.name} to ${editStatus} with roles ${roles.join(", ") || "none"}? This changes their school access.`}
          disabled={busy || !roles.length || w.mode !== "demo"}
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
        <Records
          title="Recent privileged changes"
          empty="No recent changes in this preview session."
          items={w.audit
            .filter((a) => a.action.startsWith("member."))
            .slice(0, 10)
            .map((a) => ({
              id: a.id,
              title: a.action,
              detail: `${a.actor} · ${a.at}`,
            }))}
        />
      </section>
    )
  return (
    <div className="space-y-6">
      <Records
        title={
          kind === "roles"
            ? "Roles and access"
            : kind[0].toUpperCase() + kind.slice(1)
        }
        empty="No matching school memberships. Clear filters or invite a person."
        items={members.map((m) => ({
          id: m.id,
          title: m.name,
          detail: m.roles.join(", "),
          status: m.status,
          href: `/admin/users/${m.id}`,
        }))}
      />
      {kind === "users" && (
        <section className="max-w-2xl space-y-3 rounded-xl border p-5">
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
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [year, setYear] = useState("")
  const [classId, setClassId] = useState(w.classes[0]?.id ?? "")
  const [memberId, setMemberId] = useState(
    w.members.find((m) => m.roles.includes(enrollment ? "student" : "teacher"))
      ?.id ?? ""
  )
  const [notice, setNotice] = useState("")
  return (
    <div className="space-y-6">
      <Records
        title={enrollment ? "Current enrollment" : "School classes"}
        empty="No classes are available. Create a class to begin."
        items={
          enrollment
            ? w.enrollments.map((e) => ({
                id: `${e.classId}-${e.memberId}`,
                title:
                  w.members.find((m) => m.id === e.memberId)?.name ?? "Learner",
                detail: w.classes.find((c) => c.id === e.classId)?.name,
                href: `/admin/users/${e.memberId}`,
              }))
            : w.classes.map((c) => ({
                id: c.id,
                title: c.name,
                detail: `${c.subject} · ${c.yearLevel} · ${w.enrollments.filter((e) => e.classId === c.id).length} learners · Teachers: ${
                  w.teachers
                    .filter((t) => t.classId === c.id)
                    .map(
                      (t) =>
                        w.members.find((m) => m.id === t.memberId)?.name ??
                        "Teacher"
                    )
                    .join(", ") || "Unassigned"
                }`,
                href: `/admin/classes/${c.id}`,
              }))
        }
      />
      {!enrollment && (
        <section className="max-w-2xl space-y-3 rounded-xl border p-5">
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
            disabled={name.trim().length < 2 || busy || w.mode !== "demo"}
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
      <section className="max-w-2xl space-y-3 rounded-xl border p-5">
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
          description="Apply this class membership change?"
          disabled={!classId || !memberId || busy || w.mode !== "demo"}
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
