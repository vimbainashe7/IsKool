"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { TeachingAssignments } from "@/features/classes/teaching-assignments"
import { AdminSectionCard } from "@/features/admin-workspace/admin-components"
import {
  studentRequest,
  studentSchema,
  enrollmentSchema,
  classSchema,
  termSchema,
  referenceSchema,
  type References,
} from "./contracts"
import { AcademicSetup } from "./academic-setup"

const pageSchema = z.object({
  items: z.array(
    enrollmentSchema.extend({
      student: studentSchema,
      schoolClass: classSchema,
      term: termSchema,
    })
  ),
  nextCursor: z.string().uuid().nullable(),
})
type EnrollmentPage = z.infer<typeof pageSchema>

export function EnrollmentOverview() {
  const [data, setData] = useState<EnrollmentPage | null>(null)
  const [error, setError] = useState("")
  const [page, setPage] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  function navigate(cursor: string | null) {
    setData(null)
    setPage(cursor)
  }
  useEffect(() => {
    let active = true
    studentRequest(
      `student-administration/enrollments?limit=25${page ? `&cursor=${page}` : ""}`,
      pageSchema
    )
      .then((result) => {
        if (active) {
          setData(result)
          setError("")
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Enrollment records could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [page, retry])
  return (
    <AdminSectionCard title="School enrollment records">
      <p>
        All enrollment statuses are retained. Open a student record to enroll,
        withdraw or update a student.
      </p>
      {error ? (
        <div role="alert">
          {error}{" "}
          <Button onClick={() => setRetry((v) => v + 1)}>
            Retry enrollment records
          </Button>
        </div>
      ) : !data ? (
        <p role="status">Loading enrollment records…</p>
      ) : (
        <>
          {!data.items.length ? (
            <p>No enrollment records in this school.</p>
          ) : (
            <ul>
              {data.items.map((e) => (
                <li key={e.id} className="border-b py-4">
                  <Link
                    href={`/admin/students/${e.studentId}`}
                    className="underline"
                  >
                    {e.student.givenName} {e.student.familyName}
                  </Link>
                  <p>
                    {e.student.admissionNumber} · {e.schoolClass.name} ·{" "}
                    {e.term.label} · {e.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-3 pt-4">
            {page && (
              <Button variant="outline" onClick={() => navigate(null)}>
                First enrollment page
              </Button>
            )}
            {data.nextCursor && (
              <Button onClick={() => navigate(data.nextCursor)}>
                Next enrollment page
              </Button>
            )}
          </div>
        </>
      )}
      <Link href="/admin/students" className="mt-4 inline-block underline">
        Manage students and enrollment
      </Link>
    </AdminSectionCard>
  )
}

export function SchoolClassOverview() {
  const [data, setData] = useState<References | null>(null)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    studentRequest("student-administration/context", referenceSchema)
      .then((value) => {
        if (active) {
          setData(value)
          setError("")
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Classes could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [retry])
  return (
    <>
      <AdminSectionCard title="School classes">
        {error ? (
          <p role="alert">
            {error}{" "}
            <Button onClick={() => setRetry((v) => v + 1)}>
              Retry classes
            </Button>
          </p>
        ) : !data ? (
          <p role="status">Loading school classes…</p>
        ) : (
          <>
            {data.truncated && (
              <p role="status">
                Showing up to 100 setup records. Dashboard totals include all
                records.
              </p>
            )}
            {!data.classes.length ? (
              <p>No classes have been created in this school.</p>
            ) : (
              <ul>
                {data.classes.map((c) => (
                  <li className="border-b py-3" key={c.id}>
                    {c.name} ·{" "}
                    {data.years.find((y) => y.id === c.academicYearId)?.label ??
                      "Academic year"}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p>
          Choose Teaching assignments below to manage class access. Academic
          work is not available yet.
        </p>
        <Link href="/admin/students" className="underline">
          Manage student enrollment
        </Link>
      </AdminSectionCard>
      <TeachingAssignments />
      {data && (
        <AcademicSetup initial={data} onSaved={() => setRetry((v) => v + 1)} />
      )}
    </>
  )
}
