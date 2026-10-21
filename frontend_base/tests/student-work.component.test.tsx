import { afterEach, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { StudentWork } from "@/features/assignments/student-work"
import { WorkspaceProvider } from "@/features/workspace/workspace-provider"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
const id = "a9000000-0000-4000-8000-000000000001",
  date = "2026-10-22T12:00:00.000Z"
const initial = {
  ...createWorkspaceFixture(),
  schoolId: id,
  membershipId: id,
  mode: "live" as const,
}
afterEach(() => vi.unstubAllGlobals())
it("renders the authorized backend submission status on the dashboard card", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            schoolId: id,
            membershipId: id,
            policy: {
              maxAttempts: 3,
              lateAccepted: true,
              duplicateWindowSeconds: 30,
            },
            items: [
              {
                id,
                schoolId: id,
                classId: id,
                academicYearId: id,
                academicTermId: id,
                authorMembershipId: id,
                title: "Persisted class work",
                instructions: "Explain",
                totalMarks: 10,
                dueAt: date,
                status: "published",
                version: 2,
                publishedAt: date,
                createdAt: date,
                updatedAt: date,
                latestSubmission: {
                  id,
                  assignmentId: id,
                  schoolId: id,
                  studentId: id,
                  studentMembershipId: id,
                  text: "Saved work",
                  attempt: 2,
                  status: "late",
                  submittedAt: date,
                },
              },
            ],
            nextCursor: null,
          })
        )
      )
  )
  render(
    <WorkspaceProvider initial={initial}>
      <StudentWork compact />
    </WorkspaceProvider>
  )
  expect(
    await screen.findByRole("link", { name: /Persisted class work/ })
  ).toHaveTextContent("Submitted late · Attempt 2 of 3")
})
it("shows a backend failure with retry instead of an empty assignment feed", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: "School work is temporarily unavailable." }),
          { status: 503 }
        )
      )
  )
  render(
    <WorkspaceProvider initial={initial}>
      <StudentWork compact />
    </WorkspaceProvider>
  )
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "School work is temporarily unavailable."
  )
  expect(
    screen.queryByText(/No published assignments are available/)
  ).toBeNull()
  expect(
    screen.getByRole("button", { name: "Reload assignments" })
  ).toBeVisible()
})
