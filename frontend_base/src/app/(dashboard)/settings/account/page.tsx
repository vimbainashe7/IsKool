import { requireSession } from "@/features/context/role-routing"
import { ModeToggle } from "@/components/mode-toggle"
import { TeacherSectionCard } from "@/features/teacher-workspace/teacher-components"
import styles from "@/features/teacher-workspace/teacher-workspace.module.css"
import Link from "next/link"
export default async function Page() {
  const { context } = await requireSession()
  if (context.activeRole === "teacher")
    return (
      <div className={`${styles.twoColumns} mt-6`}>
        <TeacherSectionCard title="Profile">
          <p className="font-semibold">{context.user.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {context.school.name}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Ask your school administrator to update your profile or access.
          </p>
        </TeacherSectionCard>
        <TeacherSectionCard title="Appearance">
          <p className="mb-4 text-sm text-muted-foreground">
            Choose the theme for your workspace.
          </p>
          <ModeToggle />
        </TeacherSectionCard>
        <TeacherSectionCard title="Notifications">
          <p className="mb-4 text-sm text-muted-foreground">
            View updates sent to your teaching context.
          </p>
          <Link className="text-sm underline" href="/teacher/notifications">
            Open notifications
          </Link>
        </TeacherSectionCard>
        <TeacherSectionCard title="Account and security">
          <p className="mb-4 text-sm text-muted-foreground">
            Available work contexts: {context.roles.join(", ")}
          </p>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="min-h-11 rounded-lg border px-4 py-3"
            >
              Sign out
            </button>
          </form>
        </TeacherSectionCard>
      </div>
    )
  return (
    <section className="space-y-4 px-5">
      <h2 className="text-xl font-semibold">Your account</h2>
      <p>{context.user.name}</p>
      <p>School: {context.school.name}</p>
      <p>Available work contexts: {context.roles.join(", ")}</p>
      <p>Ask your school administrator to update your profile or access.</p>
      <h3 className="font-semibold">Appearance</h3>
      <ModeToggle />
      <form action="/logout" method="post">
        <button type="submit" className="rounded-lg border px-4 py-3">
          Sign out
        </button>
      </form>
    </section>
  )
}
