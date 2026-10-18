"use client"
import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { AdminSectionCard } from "@/features/admin-workspace/admin-components"
import { Field, SelectField, formValues } from "./form-fields"
import {
  studentRequest,
  yearSchema,
  termSchema,
  classSchema,
  referenceSchema,
  type References,
} from "./contracts"

export function AcademicSetup({ onSaved }: { onSaved: () => void }) {
  const [data, setData] = useState<References | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    studentRequest("student-administration/context", referenceSchema)
      .then((value) => {
        if (active) setData(value)
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Academic setup could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [])
  async function save(
    event: FormEvent<HTMLFormElement>,
    kind: "academic-years" | "academic-terms" | "classes"
  ) {
    const dto = formValues(event)
    setBusy(true)
    setError("")
    try {
      if (kind === "academic-years")
        await studentRequest(
          `student-administration/${kind}`,
          yearSchema,
          "POST",
          dto
        )
      else if (kind === "academic-terms")
        await studentRequest(
          `student-administration/${kind}`,
          termSchema,
          "POST",
          dto
        )
      else
        await studentRequest(
          `student-administration/${kind}`,
          classSchema,
          "POST",
          dto
        )
      setData(
        await studentRequest("student-administration/context", referenceSchema)
      )
      onSaved()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Academic setup could not be saved."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <AdminSectionCard
      title="Academic setup"
      description="Define the school calendar and classes before enrolling students."
    >
      {error && <p role="alert">{error}</p>}
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.years.map((y) => y.label).join(" | ") ||
            "No academic year created yet."}
        </p>
      )}
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">
          Create academic year
        </summary>
        <form
          className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(e) => void save(e, "academic-years")}
        >
          <Field name="label" label="Year label" maxLength={80} />
          <Field name="startsOn" label="Year start" type="date" />
          <Field name="endsOn" label="Year end" type="date" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Save academic year
            </Button>
          </div>
        </form>
      </details>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">
          Create academic term
        </summary>
        <form
          className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(e) => void save(e, "academic-terms")}
        >
          <SelectField name="academicYearId" label="Term academic year">
            {data?.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </SelectField>
          <Field name="label" label="Term label" maxLength={80} />
          <Field name="startsOn" label="Term start" type="date" />
          <Field name="endsOn" label="Term end" type="date" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !data?.years.length}>
              Save academic term
            </Button>
          </div>
        </form>
      </details>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">
          Create school class
        </summary>
        <form
          className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(e) => void save(e, "classes")}
        >
          <SelectField name="academicYearId" label="Class academic year">
            {data?.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </SelectField>
          <Field name="name" label="Class name" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !data?.years.length}>
              Save school class
            </Button>
          </div>
        </form>
      </details>
    </AdminSectionCard>
  )
}
