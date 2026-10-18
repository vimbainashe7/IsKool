"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, SelectField, formValues } from "./form-fields"
import {
  AdminSectionCard,
  AdminEmptyState,
  AdminListRow,
} from "@/features/admin-workspace/admin-components"
import styles from "@/features/admin-workspace/admin-workspace.module.css"
import {
  studentRequest,
  studentSchema,
  studentDetailSchema,
  studentListSchema,
  guardianSchema,
  guardianListSchema,
  enrollmentSchema,
  referenceSchema,
  type Student,
  type StudentDetail,
  type Guardian,
  type References,
} from "./contracts"
import { AcademicSetup } from "./academic-setup"

export function StudentAdministration({ studentId }: { studentId?: string }) {
  const [students, setStudents] = useState<Student[] | null>(null)
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [references, setReferences] = useState<References | null>(null)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [guardianCursor, setGuardianCursor] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    const load = studentId
      ? Promise.all([
          studentRequest(`students/${studentId}`, studentDetailSchema),
          studentRequest("student-administration/context", referenceSchema),
          studentRequest("guardians?limit=50", guardianListSchema),
        ]).then(([detail, context, people]) => {
          if (active) {
            setStudent(detail)
            setReferences(context)
            setGuardians(people.items)
            setGuardianCursor(people.nextCursor)
            setError("")
          }
        })
      : studentRequest("students?limit=25", studentListSchema).then((data) => {
          if (active) {
            setStudents(data.items)
            setCursor(data.nextCursor)
            setError("")
          }
        })
    load.catch((e) => {
      if (active)
        setError(
          e instanceof Error
            ? e.message
            : "Student records could not be loaded."
        )
    })
    return () => {
      active = false
    }
  }, [studentId, retry])
  async function act(work: () => Promise<void>, success: string) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await work()
      setMessage(success)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The change could not be saved."
      )
    } finally {
      setBusy(false)
    }
  }
  async function refreshStudent() {
    if (studentId)
      setStudent(
        await studentRequest(`students/${studentId}`, studentDetailSchema)
      )
  }
  const feedback = (
    <>
      {error && (
        <div role="alert" className="rounded-xl border border-destructive p-4">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            Reload records
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="rounded-xl border p-4">
          {message}
        </p>
      )}
    </>
  )
  if (!studentId)
    return (
      <div className={styles.page}>
        {feedback}
        <AdminSectionCard
          title="School student records"
          description="Authoritative student identities, separate from sign-in accounts."
        >
          {students === null ? (
            <p role="status">Loading student records...</p>
          ) : students.length === 0 ? (
            <AdminEmptyState title="No student records yet">
              Create the first student below.
            </AdminEmptyState>
          ) : (
            <ul className={styles.list}>
              {students.map((s) => (
                <AdminListRow
                  key={s.id}
                  title={`${s.givenName} ${s.familyName}`}
                  detail={`${s.admissionNumber} � ${s.status}`}
                >
                  <Link className="underline" href={`/admin/students/${s.id}`}>
                    Open record
                  </Link>
                </AdminListRow>
              ))}
            </ul>
          )}
          {cursor && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                act(async () => {
                  const page = await studentRequest(
                    `students?limit=25&cursor=${cursor}`,
                    studentListSchema
                  )
                  setStudents(page.items)
                  setCursor(page.nextCursor)
                }, "Next page loaded.")
              }
            >
              Next page
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setRetry((n) => n + 1)}
          >
            Refresh student list
          </Button>
        </AdminSectionCard>
        <AdminSectionCard
          title="Create student"
          description="Create a school record, then add a guardian and enrollment from its detail page."
        >
          <form
            className="grid max-w-2xl gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              const dto = formValues(event)
              void act(async () => {
                const created = await studentRequest(
                  "students",
                  studentSchema,
                  "POST",
                  dto
                )
                setStudents((old) => [created, ...(old ?? [])])
              }, "Student created. Open the record to add a guardian and enrollment.")
            }}
          >
            <Field
              name="admissionNumber"
              label="Admission number"
              maxLength={64}
            />
            <Field name="givenName" label="Given name" />
            <Field name="familyName" label="Family name" />
            <div className="sm:col-span-2">
              <Button disabled={busy} type="submit">
                Create student
              </Button>
            </div>
          </form>
        </AdminSectionCard>
        <AcademicSetup onSaved={() => setMessage("Academic setup saved.")} />
      </div>
    )
  if (!student || !references)
    return (
      <div>
        {feedback}
        <p role="status">Loading student detail...</p>
      </div>
    )
  return (
    <div className={styles.page}>
      <Link className="underline" href="/admin/students">
        Back to student records
      </Link>
      {feedback}
      <AdminSectionCard
        title={`${student.givenName} ${student.familyName}`}
        description={`${student.admissionNumber} � ${student.status}`}
      >
        <form
          key={student.version}
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            const fields = formValues(event)
            void act(async () => {
              await studentRequest(
                `students/${studentId}`,
                studentSchema,
                "PATCH",
                { ...fields, version: student.version }
              )
              await refreshStudent()
            }, "Student record saved.")
          }}
        >
          <Field
            name="givenName"
            label="Given name"
            defaultValue={student.givenName}
          />
          <Field
            name="familyName"
            label="Family name"
            defaultValue={student.familyName}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Save student details
            </Button>
          </div>
        </form>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            act(async () => {
              await studentRequest(
                `students/${studentId}`,
                studentSchema,
                "PATCH",
                {
                  status: student.status === "active" ? "archived" : "active",
                  version: student.version,
                }
              )
              await refreshStudent()
            }, "Student lifecycle updated.")
          }
        >
          {student.status === "active" ? "Archive student" : "Restore student"}
        </Button>
      </AdminSectionCard>
      <AdminSectionCard
        title="Guardians"
        description="A guardian may be linked to more than one student in this school."
      >
        {student.guardians.length ? (
          <ul className={styles.list}>
            {student.guardians.map((link) => (
              <AdminListRow
                key={link.guardianId}
                title={link.guardian.fullName}
                detail={`${link.relationship} � ${link.guardian.email} � ${link.guardian.phone ?? "No phone"}`}
              />
            ))}
          </ul>
        ) : (
          <p>No guardian linked yet.</p>
        )}
        <form
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            const dto = formValues(event)
            void act(async () => {
              await studentRequest(
                `students/${studentId}/guardians`,
                z.object({ guardianId: z.string() }),
                "POST",
                dto
              )
              await refreshStudent()
            }, "Guardian linked to this student.")
          }}
        >
          <SelectField name="guardianId" label="Existing guardian">
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.fullName} � {g.email}
              </option>
            ))}
          </SelectField>
          <SelectField name="relationship" label="Relationship">
            <option value="parent">Parent</option>
            <option value="guardian">Guardian</option>
            <option value="other">Other</option>
          </SelectField>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={busy || student.status !== "active"}
            >
              Link guardian
            </Button>
          </div>
        </form>
        {guardianCursor && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(async () => {
                const page = await studentRequest(
                  `guardians?limit=50&cursor=${guardianCursor}`,
                  guardianListSchema
                )
                setGuardians((old) => [...old, ...page.items])
                setGuardianCursor(page.nextCursor)
              }, "More guardians loaded.")
            }
          >
            Load more guardians
          </Button>
        )}
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            Add a new guardian
          </summary>
          <form
            className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              const dto = formValues(event)
              void act(async () => {
                const created = await studentRequest(
                  "guardians",
                  guardianSchema,
                  "POST",
                  dto
                )
                setGuardians((old) => [...old, created])
              }, "Guardian created. Select the guardian and relationship above to link them.")
            }}
          >
            <Field name="fullName" label="Guardian full name" maxLength={200} />
            <Field
              name="email"
              label="Guardian email"
              type="email"
              maxLength={254}
            />
            <Field
              name="phone"
              label="Guardian phone (optional)"
              maxLength={40}
              required={false}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Create guardian
              </Button>
            </div>
          </form>
        </details>
      </AdminSectionCard>
      <AdminSectionCard
        title="Enrollment history"
        description="Closed enrollment records are retained. Reentry requires a new enrollment."
      >
        {student.enrollments.length ? (
          <ul className={styles.list}>
            {student.enrollments.map((e) => (
              <li key={e.id} className="space-y-3 rounded-xl border p-4">
                <p className="font-medium">
                  {e.schoolClass.name} � {e.term.label} �{" "}
                  <span data-testid={`enrollment-${e.id}-status`}>
                    {e.status}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Enrolled {new Date(e.enrolledAt).toLocaleDateString("en-ZW")}
                  {e.endedAt
                    ? ` � Ended ${new Date(e.endedAt).toLocaleDateString("en-ZW")}`
                    : ""}
                </p>
                {["pending", "active"].includes(e.status) && (
                  <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                      const dto = formValues(event)
                      void act(async () => {
                        await studentRequest(
                          `student-administration/enrollments/${e.id}`,
                          enrollmentSchema,
                          "PATCH",
                          { status: dto[`status-${e.id}`], version: e.version }
                        )
                        await refreshStudent()
                      }, "Enrollment status updated.")
                    }}
                  >
                    <SelectField
                      name={`status-${e.id}`}
                      label="New enrollment status"
                    >
                      {(e.status === "pending"
                        ? ["active", "cancelled"]
                        : ["withdrawn", "transferred", "completed"]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </SelectField>
                    <Button type="submit" disabled={busy}>
                      Change enrollment status
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No enrollments yet.</p>
        )}
        {references.truncated && (
          <p role="status">
            Some older academic setup records are not included in this view.
          </p>
        )}
        <form
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            const dto = formValues(event)
            void act(async () => {
              await studentRequest(
                `students/${studentId}/enrollments`,
                enrollmentSchema,
                "POST",
                dto
              )
              await refreshStudent()
            }, "Student enrolled.")
          }}
        >
          <SelectField name="classId" label="Class">
            {references.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} �{" "}
                {references.years.find((y) => y.id === c.academicYearId)?.label}
              </option>
            ))}
          </SelectField>
          <SelectField name="academicTermId" label="Academic term">
            {references.terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} �{" "}
                {references.years.find((y) => y.id === t.academicYearId)?.label}
              </option>
            ))}
          </SelectField>
          <SelectField name="status" label="Enrollment status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </SelectField>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={busy || student.status !== "active"}
            >
              Enroll student
            </Button>
          </div>
        </form>
        {(!references.classes.length || !references.terms.length) && (
          <p>
            Create an academic year, term and class on the student records page
            first.
          </p>
        )}
      </AdminSectionCard>
    </div>
  )
}
