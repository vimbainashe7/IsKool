import { redirect } from "next/navigation"
import { FileUp } from "lucide-react"

import { getCurrentSession } from "@/features/context/get-current-session"
import { PageShell } from "@/components/page-shell"
import { TeacherMaterialUploader } from "@/features/storage/teacher-material-uploader"

export default async function Page() {
  const session = await getCurrentSession()

  if (!session) {
    redirect("/sign-in")
  }

  return (
    <PageShell
      eyebrow="Private resources"
      title="Teacher materials"
      description="Upload teaching resources to private storage. Class selection will be backed by teacher-class membership."
      icon={FileUp}
    >
      <TeacherMaterialUploader
        schoolId={session.context.school.id}
        classId="selected-class"
        userId={session.context.user.id}
      />
    </PageShell>
  )
}
