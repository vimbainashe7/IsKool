"use client"

import * as React from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { buildTeacherMaterialPath, getSafeExtension } from "./storage-paths"

type TeacherMaterialUploaderProps = {
  schoolId: string
  classId: string
  userId: string
}

export function TeacherMaterialUploader(props: TeacherMaterialUploaderProps) {
  const [message, setMessage] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const file = formData.get("file")

    if (!(file instanceof File)) {
      setMessage("Choose a file before uploading.")
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const path = buildTeacherMaterialPath({
        ...props,
        extension: getSafeExtension(file.name),
      })
      const { error } = await supabase.storage
        .from("teacher-materials")
        .upload(path, file, { upsert: false })

      if (error) {
        setMessage("Upload failed. Check your class access and try again.")
        return
      }

      setMessage(`Uploaded securely. Original filename retained separately in the material record: ${file.name}`)
      event.currentTarget.reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload is not available.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader>
        <CardTitle>Upload teaching material</CardTitle>
        <CardDescription>
          Object names are generated UUID paths; the browser never controls final storage paths.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <form onSubmit={upload} className="grid gap-4">
          <Input name="file" type="file" required />
          {message && (
            <p className="rounded-xl border border-iskool-cream bg-iskool-cream/35 px-3 py-2 text-sm text-muted-foreground">
              {message}
            </p>
          )}
          <Button type="submit" className="h-11 rounded-xl" disabled={isUploading}>
            <Upload className="size-4" />
            {isUploading ? "Uploading..." : "Upload material"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
