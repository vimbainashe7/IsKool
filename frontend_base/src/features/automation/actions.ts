"use server"

import { revalidatePath } from "next/cache"

import { getCurrentSession } from "@/features/context/get-current-session"
import { createClient } from "@/lib/supabase/server"
import { generateLearningModuleFromNotes } from "@/server/ai/note-to-module-engine"

export type AutomationActionState = {
  ok?: boolean
  message?: string
  moduleTitle?: string
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function processTeacherNotesAction(
  _previousState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const session = await getCurrentSession()

  if (!session || session.context.activeRole !== "teacher") {
    return { ok: false, message: "Only teachers can generate learning modules." }
  }

  if (!session.context.membershipId) {
    return { ok: false, message: "Your teacher membership could not be resolved." }
  }

  const rawNotes = readString(formData, "rawNotes")
  const subject = readString(formData, "subject")
  const gradeLevel = readString(formData, "gradeLevel")
  const classId = readString(formData, "classId")

  try {
    const draft = await generateLearningModuleFromNotes({ rawNotes, subject, gradeLevel })
    const supabase = await createClient()

    if (supabase) {
      const { error } = await supabase.from("ai_module_drafts").insert({
        school_id: session.context.school.id,
        class_id: classId || null,
        teacher_membership_id: session.context.membershipId,
        title: draft.title,
        source_text_hash: draft.sourceTextHash,
        key_takeaways: draft.keyTakeaways,
        flashcards: draft.flashcards,
        revision_quiz: draft.revisionQuiz,
        teacher_notes: draft.summary,
      })

      if (error) {
        return {
          ok: true,
          moduleTitle: draft.title,
          message: `Generated "${draft.title}". Migration table is not available yet, so it was not persisted.`,
        }
      }
    }

    revalidatePath("/teacher/dashboard")

    return {
      ok: true,
      moduleTitle: draft.title,
      message: `Generated "${draft.title}" with ${draft.flashcards.length} flashcards and ${draft.revisionQuiz.length} quiz questions.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not generate module.",
    }
  }
}

export async function recordAttendanceAction(
  _previousState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const session = await getCurrentSession()

  if (!session || session.context.activeRole !== "teacher") {
    return { ok: false, message: "Only teachers can mark attendance." }
  }

  if (!session.context.membershipId) {
    return { ok: false, message: "Your teacher membership could not be resolved." }
  }

  const supabase = await createClient()
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." }
  }

  const { error } = await supabase.from("attendance_logs").insert({
    school_id: session.context.school.id,
    class_id: readString(formData, "classId"),
    student_membership_id: readString(formData, "studentMembershipId"),
    marked_by_membership_id: session.context.membershipId,
    attendance_date: readString(formData, "attendanceDate"),
    period_label: readString(formData, "periodLabel") || null,
    status: readString(formData, "status") || "present",
    source: "manual",
    note: readString(formData, "note") || null,
  })

  if (error) {
    return { ok: false, message: "Attendance could not be saved. Check class access and migration status." }
  }

  revalidatePath("/attendance")
  return { ok: true, message: "Attendance saved." }
}

export async function queueReminderAction(
  _previousState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const session = await getCurrentSession()

  if (!session || !["teacher", "admin"].includes(session.context.activeRole)) {
    return { ok: false, message: "Only staff can queue reminders." }
  }

  const supabase = await createClient()
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured." }
  }

  const { error } = await supabase.from("notification_events").insert({
    school_id: session.context.school.id,
    class_id: readString(formData, "classId") || null,
    audience: readString(formData, "audience") || "class",
    event_type: readString(formData, "eventType") || "assignment_due",
    title: readString(formData, "title"),
    body: readString(formData, "body"),
    deep_link: readString(formData, "deepLink") || null,
    scheduled_for: readString(formData, "scheduledFor") || new Date().toISOString(),
  })

  if (error) {
    return { ok: false, message: "Reminder could not be queued. Check migration status and role access." }
  }

  return { ok: true, message: "Reminder queued." }
}
