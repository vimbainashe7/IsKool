import { it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock("@/features/students/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/students/contracts")>()),
  studentRequest: mocks.request,
}))
import { AcademicSetup } from "@/features/students/academic-setup"
it("uses the already-loaded school calendar without another setup request", () => {
  render(
    <AcademicSetup
      initial={{ years: [], terms: [], classes: [], truncated: false }}
      onSaved={() => {}}
    />
  )
  expect(
    screen.getByText("Create academic year", { exact: true })
  ).toBeInTheDocument()
  expect(mocks.request).not.toHaveBeenCalled()
})
