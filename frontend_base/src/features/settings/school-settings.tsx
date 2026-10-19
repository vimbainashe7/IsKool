"use client"
import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
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
async function request(path = "", method = "GET", body?: BodyInit) {
  const response = await fetch(`/api/school-settings${path}`, {
    method,
    body,
    cache: "no-store",
    headers:
      body instanceof FormData
        ? {}
        : body
          ? { "content-type": "application/json" }
          : {},
  })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Settings could not be loaded."
    )
  return settingsSchema.parse(result)
}
export function SchoolSettings() {
  const router = useRouter()
  const [data, setData] = useState<Settings | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
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
  async function save(work: () => Promise<Settings>, success: string) {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      setData(await work())
      setMessage(success)
      router.refresh()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your change could not be saved."
      )
    } finally {
      setBusy(false)
    }
  }
  function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    void save(
      () =>
        request(
          "",
          "PATCH",
          JSON.stringify({
            name: form.get("name"),
            version: data?.school.brandingVersion,
          })
        ),
      "School name saved across your workspace."
    )
  }
  function profile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    void save(
      () =>
        request(
          "/profile",
          "PATCH",
          JSON.stringify({
            displayName: form.get("displayName"),
            version: data?.user.profileVersion,
          })
        ),
      "Your display name was saved."
    )
  }
  function logo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get("logo")
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) {
      setError("Choose a PNG, JPEG or WebP logo up to 2 MB.")
      return
    }
    form.set("version", String(data?.school.brandingVersion))
    void save(
      () => request("/logo", "POST", form),
      "School logo saved across your workspace."
    )
  }
  return (
    <div className="mx-4 mb-6 space-y-6 lg:mx-6">
      {error && (
        <div role="alert" className="rounded-xl border border-destructive p-4">
          {error}{" "}
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Reload settings
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="rounded-xl border p-4">
          {message}
        </p>
      )}
      {!data ? (
        !error && <p role="status">Loading school settings…</p>
      ) : (
        <fieldset
          disabled={busy}
          className="space-y-6 border-0 p-0"
          aria-busy={busy}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your account</CardTitle>
              <CardDescription>
                Update your display name. Your sign-in email and permissions
                stay managed separately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profile}
                className="grid max-w-xl gap-3"
                key={`profile-${data.user.profileVersion}`}
              >
                <Label htmlFor="admin-display-name">Your display name</Label>
                <Input
                  id="admin-display-name"
                  name="displayName"
                  required
                  maxLength={100}
                  defaultValue={data.user.displayName}
                />
                <Button type="submit">Save my name</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>School identity</CardTitle>
              <CardDescription>
                Your saved school name appears throughout the authenticated
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={rename}
                className="grid max-w-xl gap-3"
                key={`school-${data.school.brandingVersion}`}
              >
                <Label htmlFor="school-display-name">School name</Label>
                <Input
                  id="school-display-name"
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={data.school.name}
                />
                <Button type="submit">Save school name</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>School branding</CardTitle>
              <CardDescription>
                Upload, replace or remove your school logo. PNG, JPEG or WebP;
                up to 2 MB and 4096 × 4096 pixels. Images are resized and
                metadata is removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SchoolLogo
                school={{
                  id: data.school.id,
                  name: data.school.name,
                  logoUrl: data.school.logoPresent
                    ? `/api/school-logo?v=${data.school.brandingVersion}`
                    : undefined,
                }}
                subtitle="Saved school identity"
              />
              <form
                onSubmit={logo}
                className="grid max-w-xl gap-3"
                key={`logo-${data.school.brandingVersion}`}
              >
                <Label htmlFor="saved-school-logo">School logo</Label>
                <Input
                  id="saved-school-logo"
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
                <Button type="submit">
                  {data.school.logoPresent
                    ? "Replace school logo"
                    : "Save school logo"}
                </Button>
              </form>
              {data.school.logoPresent && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove the saved logo? Your school name and records will be kept."
                      )
                    )
                      void save(
                        () =>
                          request(
                            "/logo",
                            "DELETE",
                            JSON.stringify({
                              version: data.school.brandingVersion,
                            })
                          ),
                        "School logo removed."
                      )
                  }}
                >
                  Remove school logo
                </Button>
              )}
            </CardContent>
          </Card>
        </fieldset>
      )}
    </div>
  )
}
