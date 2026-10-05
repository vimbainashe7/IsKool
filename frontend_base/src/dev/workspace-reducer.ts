import type {
  Workspace,
  Mutation,
  MutationResult,
} from "@/features/workspace/contracts"
export function applyDemoMutation(
  original: Workspace,
  input: Mutation
): { workspace: Workspace; result: MutationResult } {
  const w = structuredClone(original)
  const now = new Date().toISOString()
  let savedId: string | undefined
  const uid = () => crypto.randomUUID()
  const member = (value: string) => {
    const row = w.members.find((m) => m.id === value)
    if (!row) throw new Error("This person is no longer available.")
    return row
  }
  const ownClass = (value: string) => {
    if (
      !w.classes.some((c) => c.id === value) ||
      !w.teachers.some(
        (t) => t.classId === value && t.memberId === w.membershipId
      )
    )
      throw new Error("You no longer have access to this class.")
  }
  switch (input.action) {
    case "assignment.save": {
      ownClass(input.classId)
      if (input.status === "published" && Date.parse(input.dueAt) <= Date.now())
        throw new Error("Choose a future deadline before publishing.")
      const existing = input.id
        ? w.assignments.find((a) => a.id === input.id)
        : undefined
      if (input.id && (!existing || existing.classId !== input.classId))
        throw new Error("You no longer have access to this assignment.")
      const row = { ...input, id: input.id ?? uid() }
      savedId = row.id
      if (existing)
        w.assignments = w.assignments.map((a) => (a.id === row.id ? row : a))
      else w.assignments.push(row)
      break
    }
    case "submission.finalize": {
      const a = w.assignments.find(
        (a) => a.id === input.assignmentId && a.status === "published"
      )
      if (
        !a ||
        !w.enrollments.some(
          (e) => e.classId === a.classId && e.memberId === w.membershipId
        )
      )
        throw new Error("You no longer have access to this assignment.")
      if (
        a.latePolicy === "deny" &&
        a.dueAt &&
        Date.parse(a.dueAt) < Date.now()
      )
        throw new Error("This assignment is no longer accepting submissions.")
      const existing = w.submissions.find(
        (s) => s.assignmentId === a.id && s.studentId === w.membershipId
      )
      if (existing && !a.resubmission)
        throw new Error("This assignment does not allow resubmission.")
      w.submissions = w.submissions.filter((s) => s.id !== existing?.id)
      w.submissions.push({
        id: existing?.id ?? uid(),
        assignmentId: a.id,
        studentId: w.membershipId,
        filename: input.filename,
        filePath: input.filePath,
        status: "submitted",
        submittedAt: now,
      })
      break
    }
    case "material.save": {
      ownClass(input.classId)
      const row = { ...input, id: input.id ?? uid() }
      if (
        input.id &&
        !w.materials.some(
          (m) => m.id === input.id && m.classId === input.classId
        )
      )
        throw new Error("You no longer have access to this material.")
      w.materials = [...w.materials.filter((m) => m.id !== row.id), row]
      break
    }
    case "grades.save": {
      if (
        new Set(input.entries.map((e) => e.submissionId)).size !==
        input.entries.length
      )
        throw new Error("A submission can only be graded once in a save.")
      // Validate the entire batch before committing; missing marks remain null, never zero.
      for (const e of input.entries) {
        const submission = w.submissions.find((s) => s.id === e.submissionId)
        const a = w.assignments.find((a) => a.id === submission?.assignmentId)
        if (!submission || !a)
          throw new Error("This submission is no longer available.")
        ownClass(a.classId)
        if (
          a.totalMarks === null ||
          (e.score !== null &&
            (!Number.isFinite(e.score) ||
              e.score < 0 ||
              e.score > a.totalMarks))
        )
          throw new Error("A mark is outside the assessment range.")
        const g = w.grades.find((g) => g.submissionId === e.submissionId)
        if ((g?.version ?? 0) !== e.version)
          throw new Error(
            "Marks changed since this page loaded. Reload before saving."
          )
        if (e.publish && e.score === null)
          throw new Error("Enter a mark before publishing feedback.")
      }
      for (const e of input.entries) {
        const submission = w.submissions.find((s) => s.id === e.submissionId)!
        const g = w.grades.find((g) => g.submissionId === e.submissionId)
        w.grades = w.grades.filter((g) => g.submissionId !== e.submissionId)
        w.grades.push({
          id: g?.id ?? uid(),
          submissionId: e.submissionId,
          studentId: submission.studentId,
          score: e.score,
          feedback: e.feedback,
          publishedAt: e.publish ? now : null,
          version: e.version + 1,
        })
      }
      break
    }
    case "member.update": {
      const m = member(input.memberId)
      if (
        m.id === w.membershipId &&
        (input.status !== "active" || !input.roles.includes("admin"))
      )
        throw new Error("Ask another administrator to change your own access.")
      if (
        m.roles.includes("admin") &&
        (!input.roles.includes("admin") || input.status !== "active") &&
        !w.members.some(
          (x) =>
            x.id !== m.id && x.status === "active" && x.roles.includes("admin")
        )
      )
        throw new Error("The school must keep an active administrator.")
      Object.assign(m, {
        status: input.status,
        roles: [...new Set(input.roles)],
      })
      break
    }
    case "member.invite":
      w.members.push({
        id: uid(),
        name: `${input.name} (${input.email})`,
        status: "invited",
        roles: [input.role],
      })
      break
    case "class.save":
      w.classes.push({
        id: uid(),
        name: input.name,
        subject: input.subject,
        yearLevel: input.yearLevel,
      })
      break
    case "enrollment.save": {
      if (
        !member(input.memberId).roles.includes("student") ||
        !w.classes.some((c) => c.id === input.classId)
      )
        throw new Error("Choose an existing student and class.")
      if (
        w.enrollments.some(
          (e) => e.classId === input.classId && e.memberId === input.memberId
        )
      )
        throw new Error("This student is already enrolled in the class.")
      w.enrollments.push({ classId: input.classId, memberId: input.memberId })
      break
    }
    case "teacher.assign": {
      if (
        !member(input.memberId).roles.includes("teacher") ||
        !w.classes.some((c) => c.id === input.classId)
      )
        throw new Error("Choose an existing teacher and class.")
      if (
        !w.teachers.some(
          (t) => t.memberId === input.memberId && t.classId === input.classId
        )
      )
        w.teachers.push({ memberId: input.memberId, classId: input.classId })
      break
    }
    case "ai.create": {
      ownClass(input.classId)
      if (
        input.sourceIds.some(
          (sourceId) =>
            !w.materials.some(
              (m) => m.id === sourceId && m.classId === input.classId
            )
        )
      )
        throw new Error("One source is no longer available in this class.")
      const jobId = uid()
      w.jobs.push({
        id: jobId,
        classId: input.classId,
        tool: input.tool,
        topic: input.topic,
        instructions: input.instructions,
        sourceIds: input.sourceIds,
        status: "queued",
        createdAt: now,
        error: "",
      })
      w.drafts.push({
        id: uid(),
        jobId,
        classId: input.classId,
        title: input.topic,
        body: `DEVELOPMENT SAMPLE ? verify all facts before using.\n\n${input.topic}\n\nLearning objective: ${input.instructions}\n\nDetail: ${input.detail}. Add your lesson summary, examples and source references here.`,
        questions:
          input.tool === "compile-notes"
            ? []
            : Array.from({ length: input.questionCount }, (_, i) => ({
                id: uid(),
                text: `Explain ${input.topic}: task ${i + 1} (${input.questionTypes[i % input.questionTypes.length]}).`,
                marks: input.totalMarks / input.questionCount,
                difficulty: input.difficulty,
                answer: "Teacher must supply and verify the marking guidance.",
              })),
        status: "draft",
        sourceIds: input.sourceIds,
      })
      break
    }
    case "ai.cancel":
    case "ai.retry": {
      const j = w.jobs.find((j) => j.id === input.jobId)
      if (!j) throw new Error("This job is no longer available.")
      ownClass(j.classId)
      if (
        input.action === "ai.retry" &&
        !["failed", "canceled"].includes(j.status)
      )
        throw new Error("Only failed or canceled jobs can be retried.")
      if (
        input.action === "ai.cancel" &&
        !["queued", "processing"].includes(j.status)
      )
        throw new Error("This job has already finished.")
      j.status = input.action === "ai.cancel" ? "canceled" : "queued"
      j.createdAt = now
      break
    }
    case "draft.save": {
      const d = w.drafts.find((d) => d.id === input.id)
      if (!d) throw new Error("This draft is no longer available.")
      ownClass(d.classId)
      if (w.jobs.find((j) => j.id === d.jobId)?.status !== "completed")
        throw new Error("Wait for the job to complete before reviewing.")
      if (
        input.status === "published" &&
        (d.status !== "reviewed" ||
          input.title !== d.title ||
          input.body !== d.body ||
          JSON.stringify(input.questions) !== JSON.stringify(d.questions))
      )
        throw new Error("Save and review changes before publishing.")
      Object.assign(d, {
        title: input.title,
        body: input.body,
        questions: input.questions,
        status: input.status,
      })
      break
    }
    case "draft.convert": {
      const d = w.drafts.find(
        (d) => d.id === input.id && ["reviewed", "published"].includes(d.status)
      )
      if (!d) throw new Error("Review this draft before converting it.")
      ownClass(d.classId)
      w.assignments.push({
        id: uid(),
        classId: d.classId,
        title: d.title,
        instructions:
          d.body +
          "\n" +
          d.questions.map((q) => `${q.text} (${q.marks} marks)`).join("\n"),
        totalMarks: d.questions.reduce((n, q) => n + q.marks, 0) || 20,
        dueAt: null,
        latePolicy: "allow",
        resubmission: false,
        status: "draft",
        attachment: "",
        attachmentPath: "",
      })
      break
    }
  }
  w.audit.unshift({
    id: uid(),
    action: input.action,
    actor: w.membershipId,
    at: now,
  })
  return {
    workspace: w,
    result: {
      message: "Change saved in the development adapter.",
      confirmedAt: now,
      id: savedId,
    },
  }
}
export function advanceDemoJobs(w: Workspace): boolean {
  let changed = false
  for (const j of w.jobs) {
    const elapsed = Date.now() - Date.parse(j.createdAt)
    if (j.status === "queued" && elapsed > 700) {
      j.status = "processing"
      changed = true
    }
    if (j.status === "processing" && elapsed > 1700) {
      j.status = "completed"
      changed = true
    }
  }
  return changed
}
