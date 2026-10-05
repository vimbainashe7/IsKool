import { requireSession } from "@/features/context/role-routing"
import { ModeToggle } from "@/components/mode-toggle"
export default async function Page() {
  const { context } = await requireSession()
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
