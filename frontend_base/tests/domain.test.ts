import { describe, it, expect, vi, afterEach } from "vitest"
import { safeReturnPath } from "@/lib/auth/safe-return-path"
import {
  capabilitiesForRoles,
  hasCapability,
} from "@/lib/permissions/capabilities"
import { canUseDemoSession, createDemoSession } from "@/dev/demo-session"
import { navigationFor } from "@/config/app"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import { applyDemoMutation, advanceDemoJobs } from "@/dev/workspace-reducer"
import { mutationSchema, workspaceSchema } from "@/features/workspace/contracts"
import { parseMark, nextGradeRow } from "@/features/gradebook/gradebook-model"
import { validateLearningFile } from "@/features/storage/file-validation"
import { buildAssignmentSubmissionPath } from "@/features/storage/storage-paths"
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

it("updates a saved assignment draft when it is published", () => {
  const w = createWorkspaceFixture()
  const existing = w.assignments[0]
  const input = mutationSchema.parse({
    ...existing,
    action: "assignment.save",
    id: undefined,
    title: "New draft",
    dueAt: "2099-01-01T12:00:00.000Z",
    status: "draft",
  })
  const first = applyDemoMutation(w, input)
  expect(first.result.id).toBeTruthy()
  const published = applyDemoMutation(
    first.workspace,
    mutationSchema.parse({ ...input, id: first.result.id, status: "published" })
  )
  expect(published.workspace.assignments).toHaveLength(w.assignments.length + 1)
  expect(
    published.workspace.assignments.find((a) => a.id === first.result.id)
      ?.status
  ).toBe("published")
})
describe("Auth boundaries", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/home\n",
    null,
  ])("rejects unsafe return %s", (value) =>
    expect(safeReturnPath(value)).toBe("/home")
  )
  it("preserves a valid internal deep link", () =>
    expect(safeReturnPath("/student/assignments/a?tab=feedback")).toBe(
      "/student/assignments/a?tab=feedback"
    ))
  it("does not grant privileged capabilities to students", () => {
    expect(
      hasCapability(capabilitiesForRoles(["student"]), "roles.manage")
    ).toBe(false)
    expect(createDemoSession("student").context.roles).toEqual(["student"])
    expect(
      navigationFor(createDemoSession("student").context)
        .flatMap((g) => g.items)
        .some((i) => i.url.startsWith("/admin"))
    ).toBe(false)
  })
  it("requires an explicit flag and never enables preview in production", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ISKOOL_ENABLE_DEMO", "false")
    expect(canUseDemoSession()).toBe(false)
    vi.stubEnv("ISKOOL_ENABLE_DEMO", "true")
    expect(canUseDemoSession()).toBe(true)
    vi.stubEnv("NODE_ENV", "production")
    expect(canUseDemoSession()).toBe(false)
  })
})
describe("Gradebook", () => {
  it.each([
    ["", null],
    ["0", 0],
    ["49.5", 49.5],
  ])("keeps missing distinct from zero (%s)", (value, expected) =>
    expect(parseMark(String(value), 50).score).toBe(expected)
  )
  it.each(["51", "-1", "NaN", "Infinity", "abc"])(
    "rejects invalid mark %s",
    (value) => expect(parseMark(value, 50).error).toBeTruthy()
  )
  it("moves and clamps keyboard rows", () => {
    expect(nextGradeRow(3, "Tab", 30)).toBe(4)
    expect(nextGradeRow(3, "Tab", 30, true)).toBe(2)
    expect(nextGradeRow(0, "ArrowUp", 30)).toBe(0)
    expect(nextGradeRow(29, "Enter", 30)).toBe(29)
  })
  it("saves a batch atomically and rejects stale versions without mutating input", () => {
    const w = createWorkspaceFixture()
    const saved = applyDemoMutation(w, {
      action: "grades.save",
      entries: [
        {
          submissionId: w.submissions[0].id,
          score: 40,
          feedback: "Good reasoning",
          publish: false,
          version: 0,
        },
      ],
    }).workspace
    expect(w.grades).toHaveLength(0)
    expect(saved.grades[0].version).toBe(1)
    expect(() =>
      applyDemoMutation(saved, {
        action: "grades.save",
        entries: [
          {
            submissionId: w.submissions[1].id,
            score: 35,
            feedback: "",
            publish: false,
            version: 0,
          },
          {
            submissionId: w.submissions[0].id,
            score: 44,
            feedback: "",
            publish: false,
            version: 0,
          },
        ],
      })
    ).toThrow(/changed/)
    expect(saved.grades).toHaveLength(1)
  })
  it("rejects an unrelated class grade", () => {
    const w = createWorkspaceFixture()
    w.teachers = []
    expect(() =>
      applyDemoMutation(w, {
        action: "grades.save",
        entries: [
          {
            submissionId: w.submissions[0].id,
            score: 20,
            feedback: "",
            publish: false,
            version: 0,
          },
        ],
      })
    ).toThrow(/access/)
  })
})
describe("Workflows", () => {
  it("validates file type, emptiness and size", () => {
    expect(validateLearningFile({ name: "work.pdf", size: 100 })).toBeNull()
    expect(validateLearningFile({ name: "work.exe", size: 100 })).toMatch(
      /Choose/
    )
    expect(validateLearningFile({ name: "work.pdf", size: 0 })).toMatch(/empty/)
    expect(
      validateLearningFile({ name: "work.pdf", size: 11 * 1024 * 1024 })
    ).toMatch(/10 MB/)
  })
  it("uses unpredictable generated object names", () => {
    const args = {
      schoolId: "school",
      classId: "class",
      assignmentId: "assignment",
      userId: "student",
      extension: "pdf",
    }
    expect(buildAssignmentSubmissionPath(args)).not.toBe(
      buildAssignmentSubmissionPath(args)
    )
    expect(buildAssignmentSubmissionPath(args)).toMatch(
      /students\/student\/[a-f0-9-]+\.pdf$/
    )
  })
  it("validates payloads and blocks arbitrary roles", () =>
    expect(
      mutationSchema.safeParse({
        action: "member.update",
        memberId: "student-1",
        roles: ["superadmin"],
        status: "active",
      }).success
    ).toBe(false))
  it("finalizes submissions only once with server time", () => {
    const w = createWorkspaceFixture()
    w.membershipId = "student-1"
    const result = applyDemoMutation(w, {
      action: "submission.finalize",
      assignmentId: "assignment-1",
      filename: "answer.pdf",
      filePath: "demo/file",
    })
    expect(
      result.workspace.submissions.find((s) => s.studentId === "student-1")
        ?.submittedAt
    ).toBe(result.result.confirmedAt)
    expect(() =>
      applyDemoMutation(result.workspace, {
        action: "submission.finalize",
        assignmentId: "assignment-1",
        filename: "answer.pdf",
        filePath: "demo/file",
      })
    ).toThrow(/resubmission/)
  })
  it("rejects closed late submissions", () => {
    const w = createWorkspaceFixture()
    w.membershipId = "student-1"
    expect(() =>
      applyDemoMutation(w, {
        action: "submission.finalize",
        assignmentId: "assignment-2",
        filename: "answer.pdf",
        filePath: "demo/file",
      })
    ).toThrow(/no longer accepting/)
  })
  it("keeps an active administrator", () => {
    const w = createWorkspaceFixture()
    w.members = w.members.filter((m) => m.id !== "teacher-1")
    expect(() =>
      applyDemoMutation(w, {
        action: "member.update",
        memberId: "admin-2",
        roles: ["teacher"],
        status: "suspended",
      })
    ).toThrow(/active administrator/)
  })
  it("does not automatically publish an AI draft", () => {
    const w = createWorkspaceFixture()
    const queued = applyDemoMutation(w, {
      action: "ai.create",
      classId: "class-1",
      tool: "create-test",
      topic: "Algebra",
      instructions: "Explain simultaneous equations",
      sourceIds: ["material-1"],
      questionCount: 5,
      totalMarks: 50,
      difficulty: "medium",
      questionTypes: ["short answer"],
      detail: "standard",
    }).workspace
    expect(queued.jobs[0].status).toBe("queued")
    expect(queued.drafts[0].status).toBe("draft")
    queued.jobs[0].createdAt = new Date(Date.now() - 5000).toISOString()
    advanceDemoJobs(queued)
    expect(queued.jobs[0].status).toBe("completed")
    expect(() =>
      applyDemoMutation(queued, {
        action: "draft.save",
        ...queued.drafts[0],
        status: "published",
      })
    ).toThrow(/review/)
    const reviewed = applyDemoMutation(queued, {
      action: "draft.save",
      ...queued.drafts[0],
      status: "reviewed",
    }).workspace
    const published = applyDemoMutation(reviewed, {
      action: "draft.save",
      ...reviewed.drafts[0],
      status: "published",
    }).workspace
    expect(published.drafts[0].status).toBe("published")
  })
  it.each([30, 50, 100])("validates a %i learner fixture", (count) => {
    const w = createWorkspaceFixture(count)
    expect(
      workspaceSchema
        .parse(w)
        .members.filter((m) => m.roles.includes("student"))
    ).toHaveLength(count)
  })
})
