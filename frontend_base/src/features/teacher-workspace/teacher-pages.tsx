"use client"
import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  UsersRound,
  CalendarDays,
  FileCheck2,
  Files,
  Clock3,
  Bell,
  ClipboardCheck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { useSearch } from "@/features/workspace/use-search"
import { safeReturnPath } from "@/lib/auth/safe-return-path"
import { teacherDate, teacherModel } from "./model"
import {
  TeacherSectionCard,
  TeacherSummaryCard,
  TeacherEmptyState,
  TeacherRow,
} from "./teacher-components"
import styles from "./teacher-workspace.module.css"

export function TeacherClasses() {
  const { data: w } = useWorkspace()
  const model = teacherModel(w)
  const [query, setQuery] = useState("")
  const classes = model.progress.filter((c) =>
    `${c.name} ${c.subject}`.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className={styles.page}>
      <div className={styles.summaries}>
        <TeacherSummaryCard
          label="Assigned classes"
          value={model.classes.length}
          icon={BookOpen}
        />
        <TeacherSummaryCard
          label="Enrolled students"
          value={
            new Set(
              w.enrollments
                .filter((e) => model.classes.some((c) => c.id === e.classId))
                .map((e) => e.memberId)
            ).size
          }
          icon={UsersRound}
        />
        <TeacherSummaryCard
          label="Today's lessons"
          value={model.today.length}
          icon={CalendarDays}
        />
        <TeacherSummaryCard
          label="Awaiting review"
          value={model.awaiting.length}
          icon={FileCheck2}
        />
      </div>
      <div>
        <Label htmlFor="teacher-class-search">Search your classes</Label>
        <Input
          id="teacher-class-search"
          className="mt-2 max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Class or subject"
        />
      </div>
      <div className={styles.classGrid}>
        {classes.map((c) => (
          <Card className={styles.classCard} key={c.id}>
            <div className={styles.classVisual}>
              <BookOpen size={38} aria-hidden="true" />
              <span className={styles.meta}>{c.yearLevel}</span>
            </div>
            <h2>
              <Link href={`/teacher/classes/${c.id}`}>{c.name}</Link>
            </h2>
            <p className={styles.meta}>
              {c.subject} · {c.learners} enrolled students
            </p>
            <div className={styles.classFacts}>
              <div>
                <h3>Scheduled lesson</h3>
                <p className={styles.meta}>
                  {c.next
                    ? `${model.days[c.next.weekday - 1]} · ${c.next.start.slice(0, 5)} – ${c.next.end.slice(0, 5)}${c.next.room ? ` · ${c.next.room}` : ""}`
                    : "No upcoming lesson in this week’s timetable."}
                </p>
              </div>
              <div>
                <h3>Upcoming assignment</h3>
                <p className={styles.meta}>
                  {c.due
                    ? `${c.due.title} · ${teacherDate(c.due.dueAt!)}`
                    : "No upcoming assignment deadline."}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/teacher/classes/${c.id}`}>Open class</Link>
            </Button>
          </Card>
        ))}
      </div>
      {!classes.length && (
        <TeacherSectionCard title="Your classes">
          <TeacherEmptyState>
            {query
              ? "No classes match this search. Try another class or subject."
              : "No classes are assigned to you yet."}
          </TeacherEmptyState>
        </TeacherSectionCard>
      )}
    </div>
  )
}
export function TeacherClassDetail({ id }: { id: string }) {
  const { data: w } = useWorkspace()
  const model = teacherModel(w)
  const c = model.progress.find((c) => c.id === id)
  if (!c)
    return (
      <TeacherSectionCard title="Class unavailable">
        <TeacherEmptyState href="/teacher/classes" action="Return to classes">
          You no longer have access to this class.
        </TeacherEmptyState>
      </TeacherSectionCard>
    )
  const work = model.assignments.filter((a) => a.classId === id)
  const materials = model.materials.filter((m) => m.classId === id)
  return (
    <div className={styles.page}>
      <TeacherSectionCard title={c.name}>
        <p className="mb-5 text-sm text-muted-foreground">
          {c.subject} · {c.yearLevel}
        </p>
        <div className={styles.summaries}>
          <TeacherSummaryCard
            label="Enrolled students"
            value={c.learners}
            icon={UsersRound}
          />
          <TeacherSummaryCard label="Assignments" value={work.length} />
          <TeacherSummaryCard
            label="Materials"
            value={materials.length}
            icon={Files}
          />
          <TeacherSummaryCard
            label="Recorded marks"
            value={c.marked}
            icon={ClipboardCheck}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/teacher/assignments/new">Create assignment</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/materials">Materials</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/gradebook">Gradebook</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/attendance">Attendance</Link>
          </Button>
        </div>
      </TeacherSectionCard>
      <div className={styles.twoColumns}>
        <TeacherSectionCard
          title="Class assignments"
          href="/teacher/assignments"
        >
          {work.length ? (
            <ul>
              {work.map((a) => (
                <TeacherRow
                  key={a.id}
                  title={a.title}
                  detail={
                    a.dueAt ? `Due ${teacherDate(a.dueAt)}` : "No deadline set"
                  }
                  status={a.status}
                  href={`/teacher/assignments/${a.id}`}
                />
              ))}
            </ul>
          ) : (
            <TeacherEmptyState
              href="/teacher/assignments/new"
              action="Create assignment"
            >
              No assignments have been created for this class.
            </TeacherEmptyState>
          )}
        </TeacherSectionCard>
        <TeacherSectionCard title="Class documents" href="/teacher/materials">
          {materials.length ? (
            <ul>
              {materials.map((m) => (
                <TeacherRow
                  key={m.id}
                  title={m.title}
                  detail={m.topic}
                  status={m.status}
                  icon={Files}
                  href={`/api/files?type=material&id=${m.id}`}
                />
              ))}
            </ul>
          ) : (
            <TeacherEmptyState>
              No teaching materials have been added yet.
            </TeacherEmptyState>
          )}
        </TeacherSectionCard>
        <TeacherSectionCard title="Class learners">
          <ul>
            {w.enrollments
              .filter((e) => e.classId === id)
              .map((e) => (
                <TeacherRow
                  key={e.memberId}
                  title={
                    w.members.find((m) => m.id === e.memberId)?.name ??
                    "Learner"
                  }
                  icon={UsersRound}
                />
              ))}
          </ul>
          {!c.learners && (
            <TeacherEmptyState>
              No learners have been enrolled yet.
            </TeacherEmptyState>
          )}
        </TeacherSectionCard>
        <TeacherSectionCard title="Class schedule" href="/teacher/timetable">
          <ul>
            {model.timetable
              .filter((t) => t.classId === id)
              .map((t) => (
                <TeacherRow
                  key={t.id}
                  title={model.days[t.weekday - 1]}
                  detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${t.room || "Room not supplied"}`}
                  icon={CalendarDays}
                />
              ))}
          </ul>
          {!model.timetable.some((t) => t.classId === id) && (
            <TeacherEmptyState>
              No lessons have been scheduled yet.
            </TeacherEmptyState>
          )}
        </TeacherSectionCard>
      </div>
    </div>
  )
}
export function TeacherAssignments() {
  const { data: w } = useWorkspace()
  const model = teacherModel(w)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const soon = model.assignments.filter(
    (a) =>
      a.status === "published" &&
      a.dueAt &&
      Date.parse(a.dueAt) >= Date.parse(w.asOf) &&
      Date.parse(a.dueAt) - Date.parse(w.asOf) <= 7 * 86400000
  )
  const assignments = model.assignments.filter(
    (a) =>
      (status === "all" || a.status === status) &&
      `${a.title} ${model.classes.find((c) => c.id === a.classId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  return (
    <div className={styles.page}>
      <div className={styles.summaries}>
        <TeacherSummaryCard
          label="Draft"
          value={model.assignments.filter((a) => a.status === "draft").length}
        />
        <TeacherSummaryCard
          label="Published"
          value={
            model.assignments.filter((a) => a.status === "published").length
          }
        />
        <TeacherSummaryCard
          label="Due within 7 days"
          value={soon.length}
          icon={Clock3}
        />
        <TeacherSummaryCard
          label="Awaiting review"
          value={model.awaiting.length}
          icon={FileCheck2}
        />
      </div>
      <TeacherSectionCard title="Assignments">
        <div className={styles.filters}>
          <div>
            <Label htmlFor="teacher-assignment-query">Search assignments</Label>
            <Input
              id="teacher-assignment-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Assignment or class"
            />
          </div>
          <div>
            <Label htmlFor="teacher-assignment-status">Status</Label>
            <select
              className="iskool-select"
              id="teacher-assignment-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["all", "draft", "published", "archived"].map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {assignments.length ? (
          <ul>
            {assignments.map((a) => (
              <TeacherRow
                key={a.id}
                title={a.title}
                href={`/teacher/assignments/${a.id}`}
                detail={`${model.classes.find((c) => c.id === a.classId)?.name ?? "Class"} · ${a.dueAt ? `Due ${teacherDate(a.dueAt)}` : "No deadline set"} · ${model.submissions.filter((s) => s.assignmentId === a.id).length} submissions`}
                status={a.status}
              />
            ))}
          </ul>
        ) : (
          <TeacherEmptyState
            href="/teacher/assignments/new"
            action="Create assignment"
          >
            {query || status !== "all"
              ? "No assignments match these filters."
              : "Create your first assignment for an assigned class."}
          </TeacherEmptyState>
        )}
      </TeacherSectionCard>
    </div>
  )
}
export function TeacherTimetable() {
  const { data: w, refresh, busy } = useWorkspace()
  const model = teacherModel(w)
  const [period, setPeriod] = useState("week")
  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <div>
          <Label htmlFor="teacher-timetable-view">Timetable view</Label>
          <select
            className="iskool-select max-w-xs"
            id="teacher-timetable-view"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">Week</option>
            <option value="today">Today</option>
          </select>
        </div>
        <p className={styles.meta}>All times shown in Africa/Harare</p>
      </div>
      {w.warnings.some((v) => v.toLowerCase().includes("timetable")) && (
        <TeacherSectionCard title="Timetable unavailable">
          <p className="mb-3 text-sm">
            We couldn’t load your teaching schedule.
          </p>
          <Button disabled={busy} onClick={() => refresh().catch(() => {})}>
            Retry timetable
          </Button>
        </TeacherSectionCard>
      )}
      <div className={styles.timetable}>
        {model.days
          .map((day, i) => ({
            day,
            i,
            slots: model.timetable.filter((t) => t.weekday === i + 1),
          }))
          .filter((d) =>
            period === "today" ? d.i + 1 === model.weekday : d.slots.length > 0
          )
          .map(({ day, i, slots }) => (
            <div
              className={
                i + 1 === model.weekday
                  ? `${styles.section} ${styles.currentDay}`
                  : styles.section
              }
              key={day}
            >
              <div className={styles.sectionHeading}>
                <h2>{day}</h2>
                {i + 1 === model.weekday && (
                  <span className={styles.status}>Today</span>
                )}
              </div>
              {slots.length ? (
                <ul>
                  {slots.map((t) => (
                    <TeacherRow
                      key={t.id}
                      title={
                        model.classes.find((c) => c.id === t.classId)?.name ??
                        "Class"
                      }
                      detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${t.room || "Room not supplied"}`}
                      icon={CalendarDays}
                      href={`/teacher/classes/${t.classId}`}
                    />
                  ))}
                </ul>
              ) : (
                <TeacherEmptyState>
                  No classes are scheduled today.
                </TeacherEmptyState>
              )}
            </div>
          ))}
      </div>
      {!model.timetable.length && period === "week" && (
        <TeacherSectionCard title="Weekly timetable">
          <TeacherEmptyState>
            Your assigned lessons will appear here when a timetable is
            available.
          </TeacherEmptyState>
        </TeacherSectionCard>
      )}
    </div>
  )
}
export function TeacherAttendance() {
  const { data: w } = useWorkspace()
  const model = teacherModel(w)
  return (
    <div className={styles.page}>
      <div className={styles.summaries}>
        <TeacherSummaryCard
          label="Today's classes"
          value={new Set(model.today.map((t) => t.classId)).size}
          icon={CalendarDays}
        />
        <TeacherSummaryCard
          label="Marked"
          value="Unavailable"
          detail="Attendance service not connected"
        />
        <TeacherSummaryCard
          label="Pending"
          value="Unavailable"
          detail="Attendance records not available"
        />
        <TeacherSummaryCard
          label="Absent exceptions"
          value="Unavailable"
          detail="No attendance data supplied"
        />
      </div>
      <TeacherSectionCard title="Class attendance">
        <TeacherEmptyState>
          Attendance recording is not available for this school yet. Your
          scheduled classes are shown below; no attendance has been recorded
          here.
        </TeacherEmptyState>
      </TeacherSectionCard>
      <TeacherSectionCard
        title="Today's scheduled classes"
        href="/teacher/timetable"
      >
        {model.today.length ? (
          <ul>
            {model.today.map((t) => (
              <TeacherRow
                key={t.id}
                title={
                  model.classes.find((c) => c.id === t.classId)?.name ?? "Class"
                }
                detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)} · ${w.enrollments.filter((e) => e.classId === t.classId).length} enrolled students`}
                href={`/teacher/classes/${t.classId}`}
                icon={UsersRound}
              />
            ))}
          </ul>
        ) : (
          <TeacherEmptyState>No classes are scheduled today.</TeacherEmptyState>
        )}
      </TeacherSectionCard>
    </div>
  )
}
export function TeacherNotifications() {
  const { data: w } = useWorkspace()
  return (
    <TeacherSectionCard title="Your notifications">
      <p className={`${styles.meta} mb-3`}>
        Updates sent to your current work context
      </p>
      {w.notifications.length ? (
        <ul>
          {w.notifications.map((n) => (
            <TeacherRow
              key={n.id}
              title={n.title}
              detail={n.body}
              icon={Bell}
              href={safeReturnPath(n.href)}
            />
          ))}
        </ul>
      ) : (
        <TeacherEmptyState>
          No notifications require your attention.
        </TeacherEmptyState>
      )}
    </TeacherSectionCard>
  )
}
export function TeacherSearch() {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("all")
  const search = useSearch(query)
  const groups = [...new Set(search.results.map((r) => r.group))]
  const results = search.results.filter(
    (r) => group === "all" || r.group === group
  )
  return (
    <div className={styles.page}>
      <TeacherSectionCard title="Find your teaching work">
        <div className={styles.filters}>
          <div>
            <Label htmlFor="global-search">
              Search your authorized workspace
            </Label>
            <Input
              id="global-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setGroup("all")
              }}
              placeholder="Class, assignment, student or material"
            />
          </div>
          <div>
            <Label htmlFor="teacher-search-group">Result type</Label>
            <select
              id="teacher-search-group"
              className="iskool-select"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="all">All results</option>
              {groups.map((g) => (
                <option value={g} key={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        {search.status && (
          <p role="status" className={styles.meta}>
            {search.status}
          </p>
        )}
        {!results.length && (
          <TeacherEmptyState>
            {query.trim().length < 2
              ? "Enter at least two characters to find work in your current context."
              : search.status ||
                "No results match this search. Try another title or class."}
          </TeacherEmptyState>
        )}
      </TeacherSectionCard>
      {groups
        .filter((g) => results.some((r) => r.group === g))
        .map((g) => (
          <TeacherSectionCard key={g} title={g}>
            <ul>
              {results
                .filter((r) => r.group === g)
                .map((r) => (
                  <TeacherRow
                    key={`${g}:${r.id}`}
                    title={r.title}
                    href={safeReturnPath(r.href)}
                  />
                ))}
            </ul>
          </TeacherSectionCard>
        ))}
    </div>
  )
}
export function TeacherToolSummary({
  kind,
}: {
  kind: "materials" | "submissions" | "gradebook" | "ai"
}) {
  const { data: w } = useWorkspace()
  const m = teacherModel(w)
  const values =
    kind === "materials"
      ? [
          ["Documents", m.materials.length],
          ["Draft", m.materials.filter((v) => v.status === "draft").length],
          [
            "Published",
            m.materials.filter((v) => v.status === "published").length,
          ],
          [
            "Archived",
            m.materials.filter((v) => v.status === "archived").length,
          ],
        ]
      : kind === "submissions"
        ? [
            ["Awaiting review", m.awaiting.length],
            ["Published reviews", m.grades.filter((v) => v.publishedAt).length],
            ["Late submissions", m.late.length],
            ["Recorded submissions", m.submissions.length],
          ]
        : kind === "ai"
          ? [
              ["Teaching jobs", m.jobs.length],
              [
                "In progress",
                m.jobs.filter(
                  (j) => j.status === "queued" || j.status === "processing"
                ).length,
              ],
              [
                "Drafts for review",
                m.drafts.filter((d) => d.status === "draft").length,
              ],
              [
                "Published drafts",
                m.drafts.filter((d) => d.status === "published").length,
              ],
            ]
          : [
              ["Assigned classes", m.classes.length],
              ["Assessments", m.assignments.length],
              [
                "Recorded marks",
                m.grades.filter((g) => g.score !== null).length,
              ],
              [
                "Published reviews",
                m.grades.filter((g) => g.publishedAt).length,
              ],
            ]
  return (
    <div className={styles.summaries}>
      {values.map(([label, value]) => (
        <TeacherSummaryCard key={label} label={String(label)} value={value} />
      ))}
    </div>
  )
}
