import { beforeEach, describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { WorkspaceProvider } from "@/features/workspace/workspace-provider"
import { Gradebook } from "@/features/gradebook/gradebook"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import { applyDemoMutation } from "@/dev/workspace-reducer"
import type { Workspace } from "@/features/workspace/contracts"
const mocks = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }))
vi.mock("@/features/workspace/client", () => ({
  readWorkspace: mocks.read,
  mutateWorkspace: mocks.mutate,
}))
let current: Workspace
beforeEach(() => {
  current = createWorkspaceFixture()
  mocks.read.mockImplementation(async () => current)
  mocks.mutate.mockImplementation(async (input) => {
    const result = applyDemoMutation(current, input)
    current = result.workspace
    return result.result
  })
})
function show(count = 30) {
  current = createWorkspaceFixture(count)
  return render(
    <WorkspaceProvider initial={current}>
      <Gradebook />
    </WorkspaceProvider>
  )
}
describe("Controlled gradebook", () => {
  it.each([30, 50, 100])(
    "renders %i learners with no uncontrolled input wall",
    (count) => {
      show(count)
      expect(screen.getAllByRole("row")).toHaveLength(count + 1)
      expect(screen.queryAllByRole("textbox")).toHaveLength(0)
      expect(screen.getByRole("grid")).toHaveAttribute(
        "aria-rowcount",
        String(count + 1)
      )
    }
  )
  it("edits, tabs to next learner, saves and reloads confirmed marks", async () => {
    show()
    fireEvent.click(
      screen.getByRole("button", { name: "Mark for Learner 002: missing" })
    )
    const input = screen.getByRole("textbox", { name: "Mark for Learner 002" })
    fireEvent.change(input, { target: { value: "45" } })
    fireEvent.keyDown(input, { key: "Tab" })
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Mark for Learner 003: missing" })
      ).toHaveFocus()
    )
    expect(screen.getByText(/1 unsaved changes/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save marks" }))
    await waitFor(() =>
      expect(screen.getByText(/0 unsaved changes/)).toBeInTheDocument()
    )
    expect(current.grades[0].score).toBe(45)
  })
  it("disables saving out-of-range scores", () => {
    show()
    fireEvent.click(
      screen.getByRole("button", { name: "Mark for Learner 002: missing" })
    )
    fireEvent.change(
      screen.getByRole("textbox", { name: "Mark for Learner 002" }),
      { target: { value: "51" } }
    )
    expect(screen.getByRole("button", { name: "Save marks" })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(/0 to 50/)
  })
  it("retains dirty values after a failed save", async () => {
    show()
    mocks.mutate.mockRejectedValue(new Error("Could not save"))
    fireEvent.click(
      screen.getByRole("button", { name: "Mark for Learner 002: missing" })
    )
    fireEvent.change(
      screen.getByRole("textbox", { name: "Mark for Learner 002" }),
      { target: { value: "32" } }
    )
    fireEvent.click(screen.getByRole("button", { name: "Save marks" }))
    await waitFor(() =>
      expect(
        screen.getByText(/Your changes are still here/)
      ).toBeInTheDocument()
    )
    expect(
      screen.getByRole("textbox", { name: "Mark for Learner 002" })
    ).toHaveValue("32")
    expect(screen.getByText(/1 unsaved changes/)).toBeInTheDocument()
  })
})
