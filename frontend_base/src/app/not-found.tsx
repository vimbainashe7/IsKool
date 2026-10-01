import Link from "next/link"
import { GraduationCap } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="iskool-surface flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-[28px] border border-iskool-cream bg-white/90 p-8 text-center shadow-[0_28px_80px_rgba(4,9,61,0.12)]">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-iskool-navy text-iskool-cream">
          <GraduationCap className="size-7" />
        </div>
        <h1 className="text-4xl font-bold text-iskool-navy">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <Button asChild className="mt-5 rounded-xl">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
