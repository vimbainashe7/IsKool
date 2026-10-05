import type * as React from "react"
import { Settings } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { SchoolBrandingCard } from "@/components/school-branding-card"
import { getCurrentSession } from "@/features/context/get-current-session"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession()

  return (
    <PageShell
      eyebrow="Workspace preferences"
      title="Settings"
      description="View your account and manage your appearance preferences."
      icon={Settings}
    >
      <div className="rounded-[24px] border border-iskool-cream bg-white/70 py-6 shadow-[0_18px_55px_rgba(4,9,61,0.06)]">
        {session?.context.school && <SchoolBrandingCard school={session.context.school} />}
        {children}
      </div>
    </PageShell>
  )
}
