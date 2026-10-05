import { beforeEach, expect, it, vi } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { useState } from "react"
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/features/workspace/workspace-provider"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
const api = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }))
vi.mock("@/features/workspace/client", () => ({
  readWorkspace: api.read,
  mutateWorkspace: api.mutate,
}))
function Harness() {
  const { mutate } = useWorkspace()
  const [status, setStatus] = useState("")
  return (
    <>
      <button
        onClick={async () => {
          try {
            await mutate({ action: "grades.save", entries: [] })
            setStatus("Confirmed save")
          } catch {
            setStatus("Save failed")
          }
        }}
      >
        Save fixture
      </button>
      <p>{status}</p>
    </>
  )
}
beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})
it("keeps server confirmation when the subsequent refresh fails", async () => {
  api.mutate.mockResolvedValue({
    message: "Saved",
    confirmedAt: "2026-10-04T12:00:00Z",
  })
  api.read.mockRejectedValue(new Error("Network unavailable"))
  render(
    <WorkspaceProvider initial={createWorkspaceFixture()}>
      <Harness />
    </WorkspaceProvider>
  )
  fireEvent.click(screen.getByRole("button", { name: "Save fixture" }))
  expect(await screen.findByText("Confirmed save")).toBeVisible()
  expect(
    await screen.findByText(
      /Your change was saved, but the workspace could not refresh/
    )
  ).toBeVisible()
  expect(api.mutate).toHaveBeenCalledTimes(1)
})
it("does not report confirmation when the mutation fails", async () => {
  api.mutate.mockRejectedValue(new Error("Could not save"))
  render(
    <WorkspaceProvider initial={createWorkspaceFixture()}>
      <Harness />
    </WorkspaceProvider>
  )
  fireEvent.click(screen.getByRole("button", { name: "Save fixture" }))
  expect(await screen.findByText("Save failed")).toBeVisible()
  expect(api.read).not.toHaveBeenCalled()
})
