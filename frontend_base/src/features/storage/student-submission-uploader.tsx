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
import { buildAssignmentSubmissionPath, getSafeExtension } from "./storage-paths"

type StudentSubmissionUploaderProps = {
  schoolId: string
  classId: string
  assignmentId: string
  userId: string
}

export function StudentSubmissionUploader(props: StudentSubmissionUploaderProps) {
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
      const path = buildAssignmentSubmissionPath({
        ...props,
        extension: getSafeExtension(file.name),
      })
      const { error } = await supabase.storage
        .from("assignment-submissions")
        .upload(path, file, { upsert: false })

      if (error) {
        setMessage("Upload failed. Check the assignment and try again.")
        return
      }

      setMessage(`Uploaded securely. Original filename retained separately in the submission record: ${file.name}`)
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
        <CardTitle>Submit assignment</CardTitle>
        <CardDescription>
          Files go to a private bucket under school, class, assignment, and student path segments.
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
            {isUploading ? "Uploading..." : "Upload submission"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
