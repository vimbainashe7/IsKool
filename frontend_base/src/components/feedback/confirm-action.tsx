"use client"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
export function ConfirmAction({
  label,
  description,
  onConfirm,
  disabled = false,
}: {
  label: string
  description: string
  onConfirm: () => Promise<void>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function commit() {
    setPending(true)
    setError("")
    try {
      await onConfirm()
      setOpen(false)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This change could not be completed."
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value)
        }}
      >
        <DialogContent>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={commit}>
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
