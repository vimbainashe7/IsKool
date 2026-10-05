"use client"
import { Button } from "@/components/ui/button"
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 p-6" role="alert">
      <h1 className="text-2xl font-semibold">
        Your workspace could not be loaded
      </h1>
      <p>Try again shortly. If your session has expired, sign in again.</p>
      <Button onClick={reset}>Try again</Button>
      <a className="ml-4 underline" href="/sign-in">
        Sign in
      </a>
    </section>
  )
}
