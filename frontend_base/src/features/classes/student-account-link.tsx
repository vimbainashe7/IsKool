"use client"
import { useEffect, useState, type FormEvent } from "react"
import { toast, Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { AdminSectionCard } from "@/features/admin-workspace/admin-components"
import { studentRequest } from "@/features/students/contracts"
import {
  accountDetailSchema,
  accountLinkSchema,
  type AccountDetail,
} from "./admin-contracts"
import { RemoteChoice } from "./remote-choice"
export function StudentAccountLink({
  studentId,
  onSaved,
}: {
  studentId: string
  onSaved: () => Promise<void>
}) {
  const [data, setData] = useState<AccountDetail | null>(null),
    [value, setValue] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    studentRequest(`students/${studentId}/account`, accountDetailSchema)
      .then((result) => {
        if (active) {
          setData(result)
          setValue(result.membershipId ?? "")
          setError("")
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Account link could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [studentId, retry])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!data || busy) return
    setBusy(true)
    setError("")
    try {
      await studentRequest(
        `students/${studentId}/account`,
        accountLinkSchema,
        "PATCH",
        { membershipId: value || null, version: data.version }
      )
      toast.success("Student account link saved")
      await onSaved()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Account link could not be saved."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <AdminSectionCard
      title="Student sign-in account"
      description="Link an existing Student account so that person can see this student's current classes. Student records and sign-in accounts are separate."
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
            onClick={() => {
              setData(null)
              setRetry((v) => v + 1)
            }}
          >
            Reload account link
          </Button>
        </p>
      )}
      {!data ? (
        !error && <p role="status">Loading account link...</p>
      ) : (
        <form className="space-y-4" onSubmit={save}>
          <p>
            {data.account?.displayName
              ? `Linked to ${data.account.displayName}${data.account.email ? ` (${data.account.email})` : ""}`
              : data.membershipId
                ? "The linked account is inactive or unavailable."
                : "No sign-in account is linked."}
          </p>
          <RemoteChoice
            kind="student"
            label="Student account"
            value={value}
            onChange={setValue}
            disabled={busy}
            current={
              data.membershipId
                ? {
                    id: data.membershipId,
                    label:
                      data.account?.displayName ?? "Current linked account",
                  }
                : undefined
            }
          />
          <p className="text-sm text-muted-foreground">
            Changing this link changes which account can view this
            student&apos;s classes. Choose Not linked to remove access.
          </p>
          <Button
            type="submit"
            disabled={busy || value === (data.membershipId ?? "")}
          >
            {busy ? "Saving..." : "Save account link"}
          </Button>
        </form>
      )}
    </AdminSectionCard>
  )
}
