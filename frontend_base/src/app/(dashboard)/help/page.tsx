import { PageShell } from "@/components/page-shell"
export default function Page() {
  return (
    <PageShell title="Help">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contact your school</h2>
        <p>
          Ask your class teacher about assignments, resources and feedback.
          Contact your school administrator for account access or enrollment
          changes.
        </p>
        <p>
          If an upload fails, keep your original file and retry after
          reconnecting. Work is submitted only after a confirmation timestamp
          appears.
        </p>
      </section>
    </PageShell>
  )
}
