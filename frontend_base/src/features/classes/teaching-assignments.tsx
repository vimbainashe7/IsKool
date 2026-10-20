"use client"
import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { AdminSectionCard } from "@/features/admin-workspace/admin-components"
import { studentRequest } from "@/features/students/contracts"
import {
  teacherListSchema,
  teacherMutationSchema,
  type TeacherLinks,
} from "./admin-contracts"
import { RemoteChoice } from "./remote-choice"
export function TeachingAssignments() {
  const router = useRouter()
  const [classId, setClassId] = useState(""),
    [teacherId, setTeacherId] = useState(""),
    [data, setData] = useState<TeacherLinks | null>(null),
    [cursor, setCursor] = useState<string>(),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  useEffect(() => {
    if (!classId) return
    let active = true
    studentRequest(
      `student-administration/classes/${classId}/teachers?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      teacherListSchema
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
              : "Teaching assignments could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [classId, cursor, retry])
  async function mutate(work: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError("")
    try {
      await work()
      toast.success(message)
      setData(null)
      setRetry((v) => v + 1)
      router.refresh()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Teaching access could not be changed."
      )
    } finally {
      setBusy(false)
    }
  }
  function assign(event: FormEvent) {
    event.preventDefault()
    if (!classId || !teacherId || busy) return
    void mutate(
      () =>
        studentRequest(
          `student-administration/classes/${classId}/teachers`,
          teacherMutationSchema,
          "POST",
          { membershipId: teacherId }
        ),
      "Teacher assigned"
    )
  }
  return (
    <AdminSectionCard
      title="Teaching assignments"
      description="Choose a class, then assign an active Teacher account. Current-year assignments appear in the teacher's Classes view. Revoked access is retained as history."
    >
      <Toaster
        theme="light"
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            success: "!border-emerald-800 !bg-emerald-700 !text-white",
          },
        }}
      />
      {error && (
        <p role="alert">
          {error}{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetry((v) => v + 1)}
          >
            Reload assignments
          </Button>
        </p>
      )}
      <div className="space-y-5">
        <RemoteChoice
          kind="class"
          label="Class for teaching"
          value={classId}
          disabled={busy}
          onChange={(id) => {
            setClassId(id)
            setData(null)
            setCursor(undefined)
            setError("")
          }}
        />
        {classId && (
          <>
            {!data && !error && (
              <p role="status">Loading teaching assignments...</p>
            )}
            {data && (
              <>
                {!data.items.length ? (
                  <p>No teaching assignments on this page.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.items.map((row) => (
                      <li
                        key={row.membershipId}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                      >
                        <div>
                          <p className="font-medium">{row.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {row.email} | {row.status}
                            {!row.accountActive ? " | account inactive" : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            busy ||
                            (row.status === "revoked" && !row.accountActive)
                          }
                          onClick={() =>
                            void mutate(
                              () =>
                                studentRequest(
                                  `student-administration/classes/${classId}/teachers/${row.membershipId}`,
                                  teacherMutationSchema,
                                  "PATCH",
                                  {
                                    status:
                                      row.status === "active"
                                        ? "revoked"
                                        : "active",
                                    version: row.version,
                                  }
                                ),
                              row.status === "active"
                                ? "Teaching access removed"
                                : "Teaching access restored"
                            )
                          }
                        >
                          {row.status === "active"
                            ? "Revoke teaching access"
                            : "Restore teaching access"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-3">
                  {cursor && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setData(null)
                        setCursor(undefined)
                      }}
                    >
                      First assignments
                    </Button>
                  )}
                  {data.nextCursor && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setData(null)
                        setCursor(data.nextCursor ?? undefined)
                      }}
                    >
                      Next assignments
                    </Button>
                  )}
                </div>
              </>
            )}
            <form className="space-y-4" onSubmit={assign}>
              <RemoteChoice
                kind="teacher"
                label="Teacher account"
                value={teacherId}
                onChange={setTeacherId}
                disabled={busy}
              />
              {data?.items.some((row) => row.membershipId === teacherId) && (
                <p className="text-sm text-muted-foreground">
                  This teacher already has a record for this class. Use the
                  access control above to restore a revoked assignment.
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  busy ||
                  !teacherId ||
                  !data ||
                  data.items.some((row) => row.membershipId === teacherId)
                }
              >
                {busy ? "Saving..." : "Assign teacher"}
              </Button>
            </form>
          </>
        )}
      </div>
    </AdminSectionCard>
  )
}
