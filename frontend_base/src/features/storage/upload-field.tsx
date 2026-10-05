"use client"
import { useRef, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { validateLearningFile } from "./file-validation"
export type UploadedFile = { filename: string; filePath: string }
export function UploadField({
  classId,
  assignmentId,
  disabled,
  onChange,
}: {
  classId: string
  assignmentId?: string
  disabled?: boolean
  onChange: (value: UploadedFile | null) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("Choose a file to begin.")
  const [pending, setPending] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const request = useRef<XMLHttpRequest | null>(null)
  const picker = useRef<HTMLInputElement | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  function choose(value: File | undefined) {
    if (pending || disabled) return
    onChange(null)
    setUploaded(false)
    setProgress(0)
    const error = value ? validateLearningFile(value) : null
    setFile(error ? null : (value ?? null))
    setStatus(
      error ??
        (value ? `Ready to upload ${value.name}.` : "Choose a file to begin.")
    )
  }
  function upload() {
    if (!file || pending || disabled) return
    const body = new FormData()
    body.set("file", file)
    body.set("classId", classId)
    if (assignmentId) body.set("assignmentId", assignmentId)
    const xhr = new XMLHttpRequest()
    request.current = xhr
    setPending(true)
    setStatus("Uploading…")
    xhr.open("POST", "/api/dev/upload")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onerror = () => {
      setPending(false)
      setStatus("Your file could not be uploaded. Try again.")
    }
    xhr.onabort = () => {
      setPending(false)
      setProgress(0)
      setStatus("Upload canceled. You can try again.")
    }
    xhr.onload = () => {
      setPending(false)
      if (xhr.status !== 200) {
        setStatus("Your file could not be uploaded. Try again.")
        return
      }
      try {
        const result = JSON.parse(xhr.responseText) as UploadedFile
        onChange(result)
        setUploaded(true)
        setProgress(100)
        setStatus("File uploaded. Review it before confirming.")
      } catch {
        setStatus("Your file could not be uploaded. Try again.")
      }
    }
    xhr.send(body)
  }
  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 rounded-xl border p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        choose(e.dataTransfer.files[0])
      }}
    >
      <legend className="px-2 font-medium">Attachment</legend>
      <Label htmlFor="learning-file">Choose a file or drop it here</Label>
      <Input
        ref={picker}
        id="learning-file"
        type="file"
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
        disabled={pending || disabled}
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <p className="text-sm text-muted-foreground">
        PDF, DOCX, TXT, PNG or JPG. Maximum 10 MB.
      </p>
      {file && (
        <p className="break-all text-sm">
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </p>
      )}
      {pending && (
        <progress
          aria-label="Upload progress"
          className="w-full"
          value={progress}
          max={100}
        />
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {status}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={upload}
          disabled={!file || pending || uploaded || disabled}
        >
          {pending ? `Uploading ${progress}%` : "Upload file"}
        </Button>
        {pending ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => request.current?.abort()}
          >
            Cancel upload
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={!file}
            onClick={() => {
              choose(undefined)
              if (picker.current) picker.current.value = ""
            }}
          >
            Remove file
          </Button>
        )}
        {uploaded && (
          <Button
            type="button"
            variant="outline"
            onClick={() => picker.current?.click()}
          >
            Replace file
          </Button>
        )}
      </div>
    </fieldset>
  )
}
