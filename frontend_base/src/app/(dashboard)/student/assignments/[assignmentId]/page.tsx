import { redirect } from "next/navigation"
import { FileUp } from "lucide-react"

import { getCurrentSession } from "@/features/context/get-current-session"
import { PageShell } from "@/components/page-shell"
import { StudentSubmissionUploader } from "@/features/storage/student-submission-uploader"

type PageProps = {
  params: Promise<{ assignmentId: string }>
}

export default async function Page({ params }: PageProps) {
  const [{ assignmentId }, session] = await Promise.all([params, getCurrentSession()])

  if (!session) {
    redirect("/sign-in")
  }

  return (
    <PageShell
      eyebrow="Student submission"
      title="Assignment submission"
      description="Upload is wired to the private assignment-submissions bucket. The backend will replace the demo class id with assignment membership data."
      icon={FileUp}
    >
      <StudentSubmissionUploader
        schoolId={session.context.school.id}
        classId="class-from-assignment"
        assignmentId={assignmentId}
        userId={session.context.user.id}
      />
    </PageShell>
  )
}
