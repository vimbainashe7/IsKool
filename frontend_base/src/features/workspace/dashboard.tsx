"use client"
import Link from "next/link"
import { useWorkspace } from "./workspace-provider"
import { Records, type RecordItem } from "./records"
import { Button } from "@/components/ui/button"
import type { RoleKey } from "@/lib/permissions/capabilities"
export function RoleDashboard({ role }: { role: RoleKey }) {
  const { data: w } = useWorkspace()
  const className = (id: string) =>
    w.classes.find((c) => c.id === id)?.name ?? "Class"
  const now = Date.parse(w.asOf)
  const ownSubmission = (id: string) =>
    w.submissions.some(
      (s) => s.assignmentId === id && s.studentId === w.membershipId
    )
  const due = w.assignments.filter(
    (a) =>
      a.status === "published" &&
      !ownSubmission(a.id) &&
      a.dueAt &&
      Date.parse(a.dueAt) >= now
  )
  const overdue = w.assignments.filter(
    (a) =>
      a.status === "published" &&
      !ownSubmission(a.id) &&
      a.dueAt &&
      Date.parse(a.dueAt) < now
  )
  const assignmentItems = (rows: typeof due): RecordItem[] =>
    rows.map((a) => ({
      id: a.id,
      title: a.title,
      detail: `${className(a.classId)} · Due ${a.dueAt ? new Date(a.dueAt).toLocaleString("en-ZW", { timeZone: "Africa/Harare" }) : "not set"}`,
      href: `/${role}/assignments/${a.id}`,
    }))
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    timeZone: "Africa/Harare",
  }).format(new Date(w.asOf))
  const weekday =
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].indexOf(today) + 1
  const timetable = w.timetable
    .filter((t) => t.weekday === weekday)
    .map((t) => ({
      id: t.id,
      title: className(t.classId),
      detail: `${t.start.slice(0, 5)}–${t.end.slice(0, 5)} · ${t.room}`,
      href: `/${role}/classes/${t.classId}`,
    }))
  const sections =
    role === "student"
      ? [
          {
            title: "Today’s classes",
            items: timetable,
            empty:
              "No classes are scheduled today. Check your weekly timetable.",
          },
          {
            title: "Assignments due soon",
            items: assignmentItems(due),
            empty:
              "You’re all caught up. New work from your teachers will appear here.",
          },
          {
            title: "Overdue assignments",
            items: assignmentItems(overdue),
            empty: "No overdue work. Keep it up.",
          },
          {
            title: "Recently graded work and feedback",
            items: w.grades
              .filter((g) => g.publishedAt)
              .map((g) => ({
                id: g.id,
                title: `Mark ${g.score ?? "pending"}`,
                detail: g.feedback || "No written feedback yet",
                href: "/student/grades",
              })),
            empty:
              "Your teacher’s released marks and feedback will appear here.",
          },
          {
            title: "Announcements",
            items: w.notifications.map((n) => ({
              id: n.id,
              title: n.title,
              detail: n.body,
              href: n.href,
            })),
            empty: "No announcements require attention.",
          },
          {
            title: "Recently published materials",
            items: w.materials
              .filter((m) => m.status === "published")
              .map((m) => ({
                id: m.id,
                title: m.title,
                detail: className(m.classId),
                href: "/student/notes",
              })),
            empty: "New resources will appear when your teachers publish them.",
          },
        ]
      : role === "teacher"
        ? [
            {
              title: "Submissions awaiting review",
              items: w.submissions
                .filter(
                  (s) =>
                    !w.grades.some(
                      (g) => g.submissionId === s.id && g.publishedAt
                    )
                )
                .map((s) => ({
                  id: s.id,
                  title:
                    w.members.find((m) => m.id === s.studentId)?.name ??
                    "Learner",
                  detail: s.filename,
                  href: `/teacher/submissions?submission=${s.id}`,
                })),
              empty: "No submissions are waiting for review.",
            },
            {
              title: "Today’s classes",
              items: timetable,
              empty: "No classes scheduled today.",
            },
            {
              title: "Assignments approaching deadline",
              items: assignmentItems(
                w.assignments.filter(
                  (a) =>
                    a.status === "published" &&
                    a.dueAt &&
                    Date.parse(a.dueAt) >= now
                )
              ),
              empty: "No upcoming deadlines.",
            },
            {
              title: "Draft assignments",
              items: assignmentItems(
                w.assignments.filter((a) => a.status === "draft")
              ),
              empty: "You have no draft assignments.",
            },
            {
              title: "Unpublished teaching materials",
              items: w.materials
                .filter((m) => m.status === "draft")
                .map((m) => ({
                  id: m.id,
                  title: m.title,
                  detail: className(m.classId),
                  href: "/teacher/materials",
                })),
              empty: "All teaching materials are published.",
            },
            {
              title: "Gradebook exceptions",
              items: w.grades
                .filter((g) => g.score === null)
                .map((g) => ({
                  id: g.id,
                  title: "Missing mark",
                  href: "/teacher/gradebook",
                })),
              empty: "No recorded missing marks.",
            },
            {
              title: "AI jobs and drafts",
              items: [
                ...w.jobs
                  .filter((j) => j.status !== "completed")
                  .map((j) => ({
                    id: j.id,
                    title: j.topic,
                    status: j.status,
                    href: "/teacher/ai",
                  })),
                ...w.drafts
                  .filter((d) => d.status === "draft")
                  .map((d) => ({
                    id: d.id,
                    title: d.title,
                    status: "Awaiting review",
                    href: "/teacher/ai",
                  })),
              ],
              empty: "No AI jobs or drafts need attention.",
            },
          ]
        : [
            {
              title: "Pending invitations",
              items: w.members
                .filter((m) => m.status === "invited")
                .map((m) => ({
                  id: m.id,
                  title: m.name,
                  status: m.status,
                  href: `/admin/users/${m.id}`,
                })),
              empty: "No invitations require attention.",
            },
            {
              title: "Users requiring attention",
              items: w.members
                .filter((m) => m.status === "suspended" || !m.roles.length)
                .map((m) => ({
                  id: m.id,
                  title: m.name,
                  status: m.status,
                  href: `/admin/users/${m.id}`,
                })),
              empty: "No membership exceptions require attention.",
            },
            {
              title: "Enrollment exceptions",
              items: w.members
                .filter(
                  (m) =>
                    m.roles.includes("student") &&
                    !w.enrollments.some((e) => e.memberId === m.id)
                )
                .map((m) => ({
                  id: m.id,
                  title: m.name,
                  detail: "No class enrollment",
                  href: "/admin/enrollments",
                })),
              empty: "All visible students have a class enrollment.",
            },
            {
              title: "Classes without teachers",
              items: w.classes
                .filter((c) => !w.teachers.some((t) => t.classId === c.id))
                .map((c) => ({
                  id: c.id,
                  title: c.name,
                  href: `/admin/classes/${c.id}`,
                })),
              empty: "All visible classes have a teacher.",
            },
            {
              title: "Recent role and access changes",
              items: w.audit
                .filter((a) => a.action.startsWith("member."))
                .map((a) => ({
                  id: a.id,
                  title: a.action,
                  detail: a.at,
                  href: "/admin/audit",
                })),
              empty: "No recent access changes.",
            },
          ]
  const actions =
    role === "student"
      ? [
          ["Open assignments", "/student/assignments"],
          ["View grades", "/student/grades"],
          ["Read notes", "/student/notes"],
          ["Weekly timetable", "/student/timetable"],
        ]
      : role === "teacher"
        ? [
            ["Create assignment", "/teacher/assignments/new"],
            ["Upload material", "/teacher/materials"],
            ["Review submissions", "/teacher/submissions"],
            ["Open gradebook", "/teacher/gradebook"],
            ["Compile notes", "/teacher/ai?tool=compile-notes"],
            ["Generate test", "/teacher/ai?tool=create-test"],
            [
              "Generate assignment questions",
              "/teacher/ai?tool=create-assignment",
            ],
          ]
        : [
            ["Manage users", "/admin/users"],
            ["Manage enrollment", "/admin/enrollments"],
            ["Manage classes", "/admin/classes"],
            ["Audit history", "/admin/audit"],
          ]
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">
          {role === "student"
            ? "What should I do today?"
            : role === "teacher"
              ? "What needs my attention?"
              : "What school operations require attention?"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {today} ·{" "}
          {role === "student"
            ? "Your learning, deadlines and feedback."
            : role === "teacher"
              ? "Keep your classes and teaching work moving."
              : "Resolve people, access and enrollment exceptions."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {actions.map(([label, href]) => (
          <Button
            key={href}
            asChild
            variant="outline"
            className="h-auto min-h-11 whitespace-normal text-left"
          >
            <Link href={href}>{label}</Link>
          </Button>
        ))}
      </div>
      <div
        className={
          role === "student"
            ? "grid gap-8 lg:grid-cols-2"
            : "grid gap-6 xl:grid-cols-2"
        }
      >
        {sections.map((section) => (
          <Records key={section.title} {...section} limit={5} />
        ))}
      </div>
    </div>
  )
}
