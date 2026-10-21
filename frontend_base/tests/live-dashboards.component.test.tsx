import { expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import { WorkspaceProvider } from "@/features/workspace/workspace-provider"
import { StudentDashboard } from "@/features/student-dashboard/student-dashboard"
import { TeacherDashboard } from "@/features/teacher-workspace/teacher-dashboard"
import type { Workspace } from "@/features/workspace/contracts"
function workspace(role: "student" | "teacher"): Workspace {
  const w = createWorkspaceFixture()
  return {
    ...w,
    mode: "live",
    classes: [],
    members: [],
    assignments: [],
    submissions: [],
    grades: [],
    materials: [],
    academicContext: {
      version: 1,
      schoolId: w.schoolId,
      membershipId: w.membershipId,
      role,
      asOf: w.asOf,
      student: null,
      totalClasses: 12,
      nextCursor: "a1000000-0000-4000-8000-000000000010",
      classes: [
        {
          id: "a1000000-0000-4000-8000-000000000011",
          name: "Authoritative Science",
          academicYear: {
            id: "a1000000-0000-4000-8000-000000000012",
            label: "Academic year 2026",
            startsOn: "2026-01-01",
            endsOn: "2026-12-31",
          },
          terms: [
            {
              id: "a1000000-0000-4000-8000-000000000013",
              label: "Current Term",
              startsOn: "2026-09-01",
              endsOn: "2026-12-01",
            },
          ],
          studentCount: role === "teacher" ? 42 : null,
        },
      ],
    },
  }
}
it("shows authoritative Student classes/periods and total without inventing coursework totals", () => {
  render(
    <WorkspaceProvider initial={workspace("student")}>
      <StudentDashboard studentName="Alpha" />
    </WorkspaceProvider>
  )
  expect(
    screen.getByRole("link", { name: /Authoritative Science/ })
  ).toHaveAttribute(
    "href",
    "/student/classes/a1000000-0000-4000-8000-000000000011"
  )
  expect(screen.getByText("12 enrolled classes")).toBeVisible()
  expect(screen.getByText("Academic year 2026")).toBeVisible()
  expect(screen.getByText(/Current Term/)).toBeVisible()
  expect(screen.getByText("Assignments are not available yet.")).toBeVisible()
  expect(
    screen.queryByText(
      /caught up|0 published|0 assignments|No assignment deadlines/i
    )
  ).toBeNull()
})
it("shows Teacher counts from the authorized projection without synthesizing student identities", () => {
  render(
    <WorkspaceProvider initial={workspace("teacher")}>
      <TeacherDashboard name="Alpha" capabilities={[]} />
    </WorkspaceProvider>
  )
  expect(screen.getByText("12 assigned classes")).toBeVisible()
  expect(screen.getByText("42 active students")).toBeVisible()
  expect(
    screen.getByText("Submission review is not available yet.")
  ).toBeVisible()
  expect(
    screen.queryByText(
      /caught up|No published assignments|0 enrolled students/i
    )
  ).toBeNull()
})
it("distinguishes genuine empty enrollment from unavailable projection data", () => {
  const w = workspace("student")
  w.academicContext = {
    ...w.academicContext!,
    classes: [],
    totalClasses: 0,
    nextCursor: null,
  }
  const view = render(
    <WorkspaceProvider initial={w}>
      <StudentDashboard studentName="Alpha" />
    </WorkspaceProvider>
  )
  expect(screen.getByText("0 enrolled classes")).toBeVisible()
  expect(
    screen.getByText(/No active enrollment is linked to your account/)
  ).toBeVisible()
  view.unmount()
  render(
    <WorkspaceProvider initial={{ ...w, academicContext: null }}>
      <StudentDashboard studentName="Alpha" />
    </WorkspaceProvider>
  )
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Your classes could not be loaded"
  )
  expect(screen.queryByText("0 enrolled classes")).toBeNull()
})
