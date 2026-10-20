"use client"
import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SchoolLogo } from "@/components/school-logo"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
const settingsSchema = z.object({
  school: z.object({
    id: z.string().uuid(),
    name: z.string(),
    logoPresent: z.boolean(),
    brandingVersion: z.number().int().positive(),
  }),
  user: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    profileVersion: z.number().int().positive(),
  }),
})
type Settings = z.infer<typeof settingsSchema>
async function request(body?: FormData) {
  const response = await fetch(`/api/school-settings${body ? "/save" : ""}`, {
    method: body ? "POST" : "GET",
    body,
    cache: "no-store",
  })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Settings could not be saved. Reload before retrying."
    )
  return settingsSchema.parse(result)
}
export function SchoolSettings() {
  const router = useRouter()
  const [data, setData] = useState<Settings | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [retry, setRetry] = useState(0)
  const [file, setFile] = useState<File>()
  const [fileReset, setFileReset] = useState(0)
  const [preview, setPreview] = useState<string>()
  const [logoAction, setLogoAction] = useState<"keep" | "replace" | "remove">(
    "keep"
  )
  useEffect(() => {
    let active = true
    request()
      .then((result) => {
        if (active) {
          setData(result)
          setError("")
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Settings could not be loaded."
          )
      })
    return () => {
      active = false
    }
  }, [retry])
  useEffect(() => {
    if (!file) {
      setPreview(undefined)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data || busy || !dirty) return
    const values = new FormData(event.currentTarget)
    const body = new FormData()
    body.set("name", String(values.get("name") ?? ""))
    body.set("displayName", String(values.get("displayName") ?? ""))
    body.set("schoolVersion", String(data.school.brandingVersion))
    body.set("profileVersion", String(data.user.profileVersion))
    body.set("logoAction", logoAction)
    if (logoAction === "replace" && file) body.set("logo", file)
    setBusy(true)
    setError("")
    try {
      setData(await request(body))
      setFile(undefined)
      setLogoAction("keep")
      setDirty(false)
      setFileReset((v) => v + 1)
      toast.success("Settings saved")
      router.refresh()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your changes could not be saved."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mx-4 mb-6 space-y-6 lg:mx-6">
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
        <div role="alert" className="rounded-xl border border-destructive p-4">
          {error}{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (
                dirty &&
                !window.confirm(
                  "Reload settings and discard your unsaved changes?"
                )
              )
                return
              setData(null)
              setDirty(false)
              setFile(undefined)
              setLogoAction("keep")
              setRetry((v) => v + 1)
            }}
          >
            Reload settings
          </Button>
        </div>
      )}
      {!data ? (
        !error && <p role="status">Loading school settings…</p>
      ) : (
        <form
          onSubmit={save}
          onChange={() => setDirty(true)}
          key={`${data.school.brandingVersion}:${data.user.profileVersion}:${retry}`}
        >
          <fieldset
            disabled={busy}
            aria-busy={busy}
            className="space-y-6 border-0 p-0"
          >
            <Card>
              <CardHeader>
                <CardTitle>Your account</CardTitle>
                <CardDescription>Update your display name.</CardDescription>
              </CardHeader>
              <CardContent className="grid max-w-xl gap-3">
                <Label htmlFor="admin-display-name">Your display name</Label>
                <Input
                  id="admin-display-name"
                  name="displayName"
                  required
                  maxLength={100}
                  defaultValue={data.user.displayName}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>School identity</CardTitle>
                <CardDescription>
                  Your saved school name appears throughout your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid max-w-xl gap-3">
                <Label htmlFor="school-display-name">School name</Label>
                <Input
                  id="school-display-name"
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={data.school.name}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>School branding</CardTitle>
                <CardDescription>
                  PNG, JPEG or WebP; up to 2 MB and 4096 × 4096 pixels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SchoolLogo
                  school={{
                    id: data.school.id,
                    name: data.school.name,
                    logoUrl:
                      logoAction === "remove"
                        ? undefined
                        : (preview ??
                          (data.school.logoPresent
                            ? `/api/school-logo?v=${data.school.brandingVersion}`
                            : undefined)),
                  }}
                  subtitle={
                    logoAction === "remove"
                      ? "Logo will be removed when you save"
                      : file
                        ? "New logo preview"
                        : "School identity"
                  }
                />
                <div className="grid max-w-xl gap-3">
                  <Label htmlFor="saved-school-logo">School logo</Label>
                  <Input
                    key={fileReset}
                    id="saved-school-logo"
                    type="file"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const selected = e.currentTarget.files?.[0]
                      const invalid =
                        selected &&
                        (selected.size > 2 * 1024 * 1024 ||
                          !["image/png", "image/jpeg", "image/webp"].includes(
                            selected.type
                          ))
                      e.currentTarget.setCustomValidity(
                        invalid
                          ? "Choose a PNG, JPEG or WebP logo up to 2 MB."
                          : ""
                      )
                      if (invalid) {
                        e.currentTarget.reportValidity()
                        return
                      }
                      setFile(selected)
                      setLogoAction(selected ? "replace" : "keep")
                    }}
                  />
                </div>
                {(data.school.logoPresent ||
                  file ||
                  logoAction === "remove") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLogoAction(logoAction === "remove" ? "keep" : "remove")
                      setFile(undefined)
                      setFileReset((v) => v + 1)
                      setDirty(true)
                    }}
                  >
                    {logoAction === "remove"
                      ? "Undo logo removal"
                      : "Remove school logo"}
                  </Button>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 shadow-lg">
              <p className="text-sm text-muted-foreground" role="status">
                {busy
                  ? "Saving your changes…"
                  : dirty
                    ? "Unsaved changes"
                    : "All changes saved"}
              </p>
              <Button type="submit" disabled={!dirty}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  )
}
