"use client"
import Link from "next/link"
import {
  BookOpen,
  CalendarDays,
  Files,
  ClipboardCheck,
  FileCheck2,
  Sparkles,
  Presentation,
  ArrowUpRight,
  Clock3,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { hasCapability, type Capability } from "@/lib/permissions/capabilities"
import { teacherModel, teacherDate, type TeacherModel } from "./model"
import {
  TeacherSectionCard,
  TeacherEmptyState,
  TeacherRow,
} from "./teacher-components"
import styles from "./teacher-workspace.module.css"
import { LiveTeacherDashboardContent } from "@/features/classes/dashboard-classes"

const links = [
  {
    label: "My Classes",
    href: "/teacher/classes",
    icon: BookOpen,
    capability: "classes.view",
  },
  {
    label: "Timetable",
    href: "/teacher/timetable",
    icon: CalendarDays,
    capability: "timetable.view",
  },
  {
    label: "Teaching Materials",
    href: "/teacher/materials",
    icon: Files,
    capability: "materials.manage",
  },
  {
    label: "Gradebook",
    href: "/teacher/gradebook",
    icon: ClipboardCheck,
    capability: "grades.manage",
  },
  {
    label: "Submission Review",
    href: "/teacher/submissions",
    icon: FileCheck2,
    capability: "submissions.review",
  },
  {
    label: "AI Studio",
    href: "/teacher/ai",
    icon: Sparkles,
    capability: "ai.use",
  },
] as const
export function TeacherGreetingCard({
  name,
  model,
  asOf,
}: {
  name: string
  model: TeacherModel
  asOf: string
}) {
  const greeting =
    model.hour < 12
      ? "Good morning"
      : model.hour < 17
        ? "Good afternoon"
        : "Good evening"
  return (
    <section className={styles.hero} aria-label="Teacher welcome">
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>
          {teacherDate(asOf)} · Your teaching day
        </p>
        <h1>
          <span className="sr-only">Teacher dashboard. </span>
          {greeting}, {name.trim().split(/\s+/)[0] || "Teacher"}!
        </h1>
        <p>Here’s what needs your attention today.</p>
        <div className={styles.heroNotice}>
          <FileCheck2 size={16} aria-hidden="true" />
          {!model.academicWorkAvailable
            ? "Your current teaching assignments are shown below."
            : model.awaiting.length
              ? `${model.awaiting.length} submissions are waiting for review.`
              : "You're caught up. No submissions are waiting for review."}
        </div>
      </div>
      <div className={styles.graphic} aria-hidden="true">
        <Presentation />
        <Sparkles size={23} />
      </div>
    </section>
  )
}
export function TeacherQuickLinks({
  capabilities,
}: {
  capabilities: Capability[]
}) {
  return (
    <section aria-labelledby="teacher-quick-title">
      <h2 id="teacher-quick-title" className={styles.quickHeading}>
        Quick Links
      </h2>
      <div className={styles.quickGrid}>
        {links
          .filter((l) => hasCapability(capabilities, l.capability))
          .map(({ label, href, icon: Icon }) => (
            <Link className={styles.quick} href={href} key={href}>
              <span className={styles.icon}>
                <Icon size={26} aria-hidden="true" />
              </span>
              {label}
            </Link>
          ))}
      </div>
    </section>
  )
}
export function TodayPlanCard({ model }: { model: TeacherModel }) {
  const { data: w, refresh, busy } = useWorkspace()
  return (
    <TeacherSectionCard title="Today's Plan" href="/teacher/timetable">
      <p className={styles.meta}>School time · Africa/Harare</p>
      {w.warnings.some((v) => v.toLowerCase().includes("timetable")) ? (
        <div className={styles.empty}>
          <p>We couldn’t load today’s classes.</p>
          <button disabled={busy} onClick={() => refresh().catch(() => {})}>
            Retry timetable
          </button>
        </div>
      ) : model.today.length ? (
        <ul>
          {model.today.map((t) => (
            <TeacherRow
              key={t.id}
              title={
                model.classes.find((c) => c.id === t.classId)?.name ?? "Class"
              }
              detail={`${t.start.slice(0, 5)} – ${t.end.slice(0, 5)}${t.room ? ` · ${t.room}` : ""}`}
              href={`/teacher/classes/${t.classId}`}
              icon={Clock3}
            />
          ))}
        </ul>
      ) : (
        <TeacherEmptyState
          href="/teacher/timetable"
          action="View weekly timetable"
        >
          No classes are scheduled for today.
        </TeacherEmptyState>
      )}
    </TeacherSectionCard>
  )
}
export function RecentDocumentsCard({ model }: { model: TeacherModel }) {
  return (
    <TeacherSectionCard title="Documents" href="/teacher/materials">
      <p className={styles.meta}>Teaching materials for your classes</p>
      {model.materials.length ? (
        <ul>
          {model.materials.slice(0, 4).map((m) => (
            <TeacherRow
              key={m.id}
              title={m.title}
              detail={`${model.classes.find((c) => c.id === m.classId)?.name ?? "Class"} · ${m.filename}`}
              status={m.status}
              icon={Files}
              href={`/api/files?type=material&id=${m.id}`}
            />
          ))}
        </ul>
      ) : (
        <TeacherEmptyState href="/teacher/materials" action="Upload material">
          Upload your first teaching material. Your class documents will appear
          here.
        </TeacherEmptyState>
      )}
      {model.drafts.some(
        (d) => d.status !== "published" && d.status !== "archived"
      ) && (
        <Link href="/teacher/ai" className="mt-4 inline-flex text-xs underline">
          Teaching drafts awaiting review
        </Link>
      )}
    </TeacherSectionCard>
  )
}
export function ClassProgressCard({ model }: { model: TeacherModel }) {
  return (
    <TeacherSectionCard title="Class Progress" href="/teacher/classes">
      <p className={styles.meta}>
        Submission completion · published assignments
      </p>
      {model.progress.length ? (
        model.progress.slice(0, 3).map((c) => (
          <div className={styles.progressItem} key={c.id}>
            <Link href={`/teacher/classes/${c.id}`}>
              <h3>{c.name}</h3>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <p className={styles.meta}>{c.learners} enrolled students</p>
            {c.percent !== null ? (
              <>
                <Progress
                  value={c.percent}
                  aria-label={`${c.name} submission completion`}
                  aria-valuenow={c.percent}
                />
                <p className={styles.meta}>
                  {c.received} of {c.expected} expected submissions ·{" "}
                  {c.percent}%
                </p>
              </>
            ) : (
              <p className={`${styles.meta} mt-3`}>
                No published assignments to measure yet.
              </p>
            )}
          </div>
        ))
      ) : (
        <TeacherEmptyState>
          No classes are assigned to you yet.
        </TeacherEmptyState>
      )}
    </TeacherSectionCard>
  )
}
export function SubmissionAttentionCard({ model }: { model: TeacherModel }) {
  return (
    <div className={`${styles.section} ${styles.attention}`}>
      <div className={styles.sectionHeading}>
        <h2>Submission review</h2>
        <FileCheck2 size={20} aria-hidden="true" />
      </div>
      <div className={styles.attentionBody}>
        <strong>{model.awaiting.length}</strong>
        <p>
          {model.awaiting.length
            ? "submissions waiting for your feedback"
            : "You're caught up. No submissions are waiting for review."}
        </p>
      </div>
      <Link href="/teacher/submissions">
        Review submissions
        <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </div>
  )
}
export function TeacherDashboard({
  name,
  capabilities,
}: {
  name: string
  capabilities: Capability[]
}) {
  const { data: w } = useWorkspace()
  const model = teacherModel(w)
  return (
    <div className={styles.dashboard}>
      <TeacherGreetingCard name={name} model={model} asOf={w.asOf} />
      <TeacherQuickLinks capabilities={capabilities} />
      {w.mode === "live" ? (
        <LiveTeacherDashboardContent />
      ) : (
        <div className={styles.lower}>
          <div className={styles.planColumn}>
            <TodayPlanCard model={model} />
            {hasCapability(capabilities, "submissions.review") && (
              <SubmissionAttentionCard model={model} />
            )}
          </div>
          <RecentDocumentsCard model={model} />
          <ClassProgressCard model={model} />
        </div>
      )}
    </div>
  )
}
