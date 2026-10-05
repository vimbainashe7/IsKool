"use client"
import { useMemo, useState, useRef } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import { parseMark, nextGradeRow } from "./gradebook-model"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/state-views"
type Row = {
  id: string
  name: string
  submissionId?: string
  score: number | null
  version: number
  feedback: string
  published: boolean
}
export function Gradebook() {
  const { data: w, mutate, busy } = useWorkspace()
  const [classId, setClassId] = useState(w.classes[0]?.id ?? "")
  const [assessmentId, setAssessmentId] = useState(
    w.assignments.find((a) => a.classId === classId)?.id ?? ""
  )
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [notice, setNotice] = useState("")
  const container = useRef<HTMLDivElement>(null)
  const assessment = w.assignments.find((a) => a.id === assessmentId)
  const rows: Row[] = useMemo(
    () =>
      w.enrollments
        .filter((e) => e.classId === classId)
        .map((e) => {
          const submission = w.submissions.find(
            (s) => s.studentId === e.memberId && s.assignmentId === assessmentId
          )
          const grade = w.grades.find((g) => g.submissionId === submission?.id)
          return {
            id: e.memberId,
            name:
              w.members.find((m) => m.id === e.memberId)?.name ??
              `Learner ${e.memberId.slice(0, 8)}`,
            submissionId: submission?.id,
            score: grade?.score ?? null,
            version: grade?.version ?? 0,
            feedback: grade?.feedback ?? "",
            published: Boolean(grade?.publishedAt),
          }
        }),
    [w.enrollments, w.submissions, w.grades, w.members, classId, assessmentId]
  )

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "name", header: "Learner" },
      { id: "score", header: "Mark" },
      { id: "state", header: "State" },
    ],
    []
  )
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  })
  const dirty = Object.keys(changes).length > 0
  useUnsavedChanges(dirty)
  const invalid = Object.values(changes).some(
    (v) => parseMark(v, assessment?.totalMarks ?? null).error
  )
  function update(row: Row, value: string) {
    const baseline = row.score === null ? "" : String(row.score)
    setChanges((old) => {
      const next = { ...old }
      if (value === baseline) delete next[row.id]
      else next[row.id] = value
      return next
    })
    setNotice("")
  }
  function move(index: number, key: string, shift = false) {
    const target = nextGradeRow(index, key, rows.length, shift)
    setEditing(null)
    setActive(target)
    requestAnimationFrame(() =>
      container.current
        ?.querySelector<HTMLButtonElement>(`[data-mark-row="${target}"]`)
        ?.focus()
    )
  }
  async function save() {
    const entries = rows
      .filter((row) => row.submissionId && row.id in changes)
      .map((row) => ({
        submissionId: row.submissionId!,
        score: parseMark(changes[row.id], assessment?.totalMarks ?? null).score,
        feedback: row.feedback,
        publish: row.published,
        version: row.version,
      }))
    try {
      await mutate({ action: "grades.save", entries })
      setChanges({})
      setEditing(null)
      setNotice("Marks saved. Reload to verify the confirmed results.")
    } catch {
      setNotice(
        "Marks could not be saved. Your changes are still here; retry or reload to resolve a conflict."
      )
    }
  }
  function changeContext(next: string) {
    if (
      dirty &&
      !window.confirm("Discard unsaved marks before changing the class?")
    )
      return
    setClassId(next)
    setAssessmentId(w.assignments.find((a) => a.classId === next)?.id ?? "")
    setChanges({})
    setEditing(null)
    setActive(0)
  }
  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="grade-class">Class</Label>
          <select
            id="grade-class"
            className="iskool-select"
            value={classId}
            onChange={(e) => changeContext(e.target.value)}
          >
            {w.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="grade-assessment">Assessment</Label>
          <select
            id="grade-assessment"
            className="iskool-select"
            value={assessmentId}
            onChange={(e) => {
              if (dirty && !window.confirm("Discard unsaved marks?")) return
              setAssessmentId(e.target.value)
              setChanges({})
              setEditing(null)
            }}
          >
            {w.assignments
              .filter((a) => a.classId === classId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" id="grade-instructions">
        One assessment at a time. Enter to edit; Tab / Shift+Tab or Enter moves
        between learners; arrows move between marks; Escape closes the editor.
        Blank means missing, not zero. Paste a column of marks to fill
        consecutive submitted learners.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p role="status">
          {Object.keys(changes).length} unsaved changes · {rows.length} learners
          · Maximum {assessment?.totalMarks ?? "not supplied"}
        </p>
        <Button
          onClick={save}
          disabled={!dirty || invalid || busy || w.mode !== "demo"}
        >
          {busy ? "Saving marks…" : "Save marks"}
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => {
            if (window.confirm("Discard all unsaved marks?")) {
              setChanges({})
              setEditing(null)
            }
          }}
        >
          Discard changes
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {rows.length ? (
        <div ref={container} className="overflow-hidden rounded-xl border">
          <table
            role="grid"
            aria-label="Teacher gradebook"
            aria-describedby="grade-instructions"
            aria-rowcount={rows.length + 1}
            className="w-full table-fixed text-left text-sm"
          >
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="border-b p-2 sm:p-3"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((tableRow, index) => {
                const row = tableRow.original
                const value =
                  changes[row.id] ??
                  (row.score === null ? "" : String(row.score))
                const error = parseMark(
                  value,
                  assessment?.totalMarks ?? null
                ).error
                const editable = Boolean(row.submissionId) && w.mode === "demo"
                return (
                  <tr
                    key={row.id}
                    aria-rowindex={index + 2}
                    className={
                      row.id in changes ? "bg-amber-50 text-amber-950" : ""
                    }
                  >
                    <th
                      scope="row"
                      className="break-words border-b p-2 font-medium sm:p-3"
                    >
                      {row.name}
                    </th>
                    <td role="gridcell" className="border-b p-2 sm:p-3">
                      {editing === row.id ? (
                        <input
                          autoFocus
                          aria-label={`Mark for ${row.name}`}
                          aria-invalid={Boolean(error)}
                          aria-describedby={
                            error ? `mark-error-${row.id}` : undefined
                          }
                          inputMode="decimal"
                          className="h-11 w-full rounded-md border bg-background px-2 text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                          value={value}
                          onChange={(e) => update(row, e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              ["Tab", "Enter", "ArrowDown", "ArrowUp"].includes(
                                e.key
                              )
                            ) {
                              e.preventDefault()
                              move(index, e.key, e.shiftKey)
                            } else if (e.key === "Escape") {
                              setEditing(null)
                              requestAnimationFrame(() =>
                                container.current
                                  ?.querySelector<HTMLButtonElement>(
                                    `[data-mark-row="${index}"]`
                                  )
                                  ?.focus()
                              )
                            }
                          }}
                          onPaste={(e) => {
                            const values = e.clipboardData
                              .getData("text")
                              .trim()
                              .split(/\r?\n/)
                            if (values.length <= 1) return
                            e.preventDefault()
                            const targets = rows.slice(
                              index,
                              index + values.length
                            )
                            if (
                              targets.length !== values.length ||
                              targets.some(
                                (r, i) =>
                                  !r.submissionId ||
                                  parseMark(
                                    values[i],
                                    assessment?.totalMarks ?? null
                                  ).error
                              )
                            ) {
                              setNotice(
                                "Paste rejected. Check that each learner submitted work and every mark is within range."
                              )
                              return
                            }
                            targets.forEach((r, i) => update(r, values[i]))
                          }}
                        />
                      ) : (
                        <button
                          data-mark-row={index}
                          tabIndex={index === active ? 0 : -1}
                          aria-disabled={!editable}
                          className="h-11 w-full rounded-md border px-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
                          aria-label={`Mark for ${row.name}: ${value || "missing"}`}
                          onFocus={() => setActive(index)}
                          onClick={() => {
                            if (editable) setEditing(row.id)
                          }}
                          onKeyDown={(e) => {
                            if (
                              ["ArrowDown", "ArrowUp", "Tab"].includes(e.key)
                            ) {
                              if (
                                e.key === "Tab" &&
                                ((index === 0 && e.shiftKey) ||
                                  (index === rows.length - 1 && !e.shiftKey))
                              )
                                return
                              e.preventDefault()
                              move(index, e.key, e.shiftKey)
                            } else if (
                              (e.key === "Enter" || e.key === "F2") &&
                              editable
                            ) {
                              e.preventDefault()
                              setEditing(row.id)
                            }
                          }}
                        >
                          {value || "—"}
                        </button>
                      )}
                      {error && (
                        <p
                          id={`mark-error-${row.id}`}
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {error}
                        </p>
                      )}
                    </td>
                    <td className="break-words border-b p-2 sm:p-3">
                      {!row.submissionId
                        ? "No submission"
                        : error
                          ? "Invalid mark"
                          : row.id in changes
                            ? "Unsaved"
                            : row.published
                              ? "Published"
                              : "Draft"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No learners in this class"
          description="Choose another class or ask an administrator to check enrollment."
        />
      )}
    </section>
  )
}
