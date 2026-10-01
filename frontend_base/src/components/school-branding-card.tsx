"use client"

import * as React from "react"
import { ImageUp, RotateCcw } from "lucide-react"

import { SchoolLogo } from "@/components/school-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { IsKoolContext } from "@/features/context/session-contract"

export function SchoolBrandingCard({ school }: { school: IsKoolContext["school"] }) {
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(school.logoUrl)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function previewLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(URL.createObjectURL(file))
  }

  function resetPreview() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(school.logoUrl)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <Card className="mx-4 mb-6 overflow-hidden border-iskool-blue/20 bg-iskool-cream/45 py-0 lg:mx-6">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>School branding</CardTitle>
            <CardDescription>
              Schools can replace the IsKool fallback mark with their own logo so the workspace feels like theirs.
            </CardDescription>
          </div>
          <SchoolLogo school={{ ...school, logoUrl: previewUrl }} subtitle="Workspace preview" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={previewLogo}
          />
          <p className="text-xs text-muted-foreground">
            Preview works now. Backend persistence should store a private/admin-managed school logo URL on the school record.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImageUp className="size-4" />
            Choose logo
          </Button>
          <Button type="button" variant="outline" onClick={resetPreview}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
