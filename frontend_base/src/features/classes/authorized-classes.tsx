"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, GraduationCap, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { parseClassContext, type ClassContext } from "./contracts"
export function AuthorizedClasses({
  role,
  resourceId,
}: {
  role: "student" | "teacher"
  resourceId?: string
}) {
  const { data: workspace } = useWorkspace()
  const [data, setData] = useState<ClassContext | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [retry, setRetry] = useState(0)
  const [pages, setPages] = useState<Array<string | undefined>>([undefined])
  const cursor = pages[pages.length - 1]
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const query = new URLSearchParams({ role, limit: "25" })
    if (cursor && !resourceId) query.set("cursor", cursor)
    fetch(
      `/api/academic-context${resourceId ? `/classes/${encodeURIComponent(resourceId)}` : ""}?${query}`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok)
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : "Classes could not be loaded. Please retry."
          )
        return parseClassContext(
          body,
          workspace.schoolId,
          workspace.membershipId,
          role
        )
      })
      .then((result) => {
        if (resourceId && result.classes[0]?.id !== resourceId)
          throw new Error("This class is not available to your account.")
        if (active) {
          setData(result)
          setError("")
        }
      })
      .catch((e) => {
        if (active) {
          setData(null)
          setError(
            e instanceof Error ? e.message : "Classes could not be loaded."
          )
        }
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [
    role,
    resourceId,
    cursor,
    retry,
    workspace.schoolId,
    workspace.membershipId,
  ])
  function move(next: Array<string | undefined>) {
    setBusy(true)
    setData(null)
    setError("")
    setPages(next)
  }
  return (
    <div className="space-y-6">
      {resourceId && (
        <Link className="text-sm underline" href={`/${role}/classes`}>
          Back to your classes
        </Link>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="size-6 text-primary" />
            <CardTitle>
              {resourceId
                ? "Class details"
                : role === "student"
                  ? "Your enrolled classes"
                  : "Your assigned classes"}
            </CardTitle>
          </div>
          <CardDescription>
            {role === "student"
              ? "Active enrollments in the current academic period."
              : "Classes you are assigned to teach during the current academic year."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {busy && <p role="status">Loading your classes...</p>}
          {error && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-destructive p-4"
            >
              <p>{error}</p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  setRetry((v) => v + 1)
                }}
              >
                Retry classes
              </Button>
            </div>
          )}
          {data && !resourceId && (
            <p className="flex items-center gap-3 text-lg">
              <GraduationCap className="size-5" />
              <strong>{data.totalClasses}</strong>{" "}
              {role === "student" ? "enrolled classes" : "assigned classes"}
            </p>
          )}
          {data?.student && (
            <p className="mt-3 text-sm text-muted-foreground">
              {data.student.givenName} {data.student.familyName} |{" "}
              {data.student.admissionNumber}
            </p>
          )}
          {data && !data.classes.length && (
            <p className="mt-4">
              {data.totalClasses > 0
                ? "There are no classes on this page. Return to the previous page."
                : role === "student"
                  ? data.student
                    ? "No current class enrollments. Ask your school administrator to review your enrollment."
                    : "No active student record is linked to your account. Ask your school administrator to link it."
                  : "No current teaching assignments. Ask your school administrator to review your class assignments."}
            </p>
          )}
        </CardContent>
      </Card>
      {data && (
        <div
          className={
            resourceId
              ? "space-y-6"
              : "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {data.classes.map((schoolClass) => (
            <Card key={schoolClass.id}>
              <CardHeader>
                <CardTitle>{schoolClass.name}</CardTitle>
                <CardDescription>
                  {schoolClass.academicYear.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  {schoolClass.terms.length
                    ? schoolClass.terms.map((term) => term.label).join(" | ")
                    : "No current academic term"}
                </p>
                {role === "teacher" && schoolClass.studentCount !== null && (
                  <p className="flex items-center gap-2">
                    <UsersRound className="size-4" />
                    {schoolClass.studentCount} actively enrolled students
                  </p>
                )}
                {resourceId ? (
                  <>
                    <p className="text-sm font-medium">
                      {role === "student"
                        ? "Your active enrollment is verified."
                        : "Your active teaching assignment is verified."}
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {schoolClass.terms.map((term) => (
                        <li key={term.id}>
                          {term.label}: {term.startsOn} to {term.endsOn}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Assignments, grades and timetable are not available here
                      yet.
                    </p>
                  </>
                ) : (
                  <Link
                    className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                    href={`/${role}/classes/${schoolClass.id}`}
                  >
                    Open class
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!resourceId && (
        <div className="flex flex-wrap gap-3">
          {pages.length > 1 && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => move(pages.slice(0, -1))}
            >
              Previous classes
            </Button>
          )}
          {data?.nextCursor && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => move([...pages, data.nextCursor ?? undefined])}
            >
              Next classes
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
