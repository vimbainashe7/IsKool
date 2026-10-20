import type * as React from "react"
import { Settings } from "lucide-react"

import { PageShell } from "@/components/page-shell"
import { SchoolBrandingCard } from "@/components/school-branding-card"
import { SchoolSettings } from "@/features/settings/school-settings"
import { SchoolLogo } from "@/components/school-logo"
import { getCurrentSession } from "@/features/context/get-current-session"
import { TeacherPageHeader } from "@/features/teacher-workspace/teacher-components"
import teacherStyles from "@/features/teacher-workspace/teacher-workspace.module.css"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession()

  if (session?.context.activeRole === "teacher")
    return (
      <div
        className={`mx-auto max-w-[1440px] px-4 lg:px-6 ${teacherStyles.canvas}`}
      >
        <div className={teacherStyles.page}>
          <TeacherPageHeader
            title="Settings"
            description="View your account, work contexts and appearance preferences."
          />
          <div className={teacherStyles.section}>
            {session.status === "iskool" ? (
              <SchoolLogo
                school={session.context.school}
                subtitle="School identity"
              />
            ) : (
              session.context.school && (
                <SchoolBrandingCard school={session.context.school} />
              )
            )}
            {children}
          </div>
        </div>
      </div>
    )

  return (
    <PageShell
      eyebrow="Workspace preferences"
      title="Settings"
      description="View your account and manage your appearance preferences."
      icon={Settings}
    >
      <div className="rounded-[24px] border border-iskool-cream bg-white/70 py-6 shadow-[0_18px_55px_rgba(4,9,61,0.06)] dark:bg-background">
        {session?.status === "iskool" ? (
          session.context.activeRole === "admin" ? (
            <SchoolSettings />
          ) : (
            <div className="mx-6 mb-6">
              <SchoolLogo
                school={session.context.school}
                subtitle="School identity"
              />
            </div>
          )
        ) : (
          session?.context.school && (
            <SchoolBrandingCard school={session.context.school} />
          )
        )}
        {children}
      </div>
    </PageShell>
  )
}
