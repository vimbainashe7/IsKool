import { afterEach, expect, it, vi } from "vitest"
import {
  studentRequest,
  studentListSchema,
  studentSchema,
} from "@/features/students/contracts"
afterEach(() => vi.unstubAllGlobals())
it("keeps a real zero result distinct from an unavailable API", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ items: [], nextCursor: null }))
  )
  expect(await studentRequest("students", studentListSchema)).toEqual({
    items: [],
    nextCursor: null,
  })
})
it("surfaces authorization failure instead of returning fixture data", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "Permission denied" }, { status: 403 })
      )
  )
  await expect(studentRequest("students", studentListSchema)).rejects.toThrow(
    "Permission denied"
  )
})
it("rejects malformed success payloads", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ items: [{ id: "not-a-student" }], nextCursor: null })
      )
  )
  await expect(studentRequest("students", studentListSchema)).rejects.toThrow(
    "unexpected response"
  )
})
it("sends mutations through the same-origin server boundary without browser tokens", async () => {
  const dto = {
    admissionNumber: "A-1",
    givenName: "Alpha",
    familyName: "Learner",
  }
  const student = {
    ...dto,
    id: "40000000-0000-4000-8000-000000000001",
    schoolId: "10000000-0000-4000-8000-000000000001",
    version: 1,
    status: "active",
  }
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json(student, { status: 201 }))
  vi.stubGlobal("fetch", fetcher)
  expect(await studentRequest("students", studentSchema, "POST", dto)).toEqual(
    student
  )
  expect(fetcher).toHaveBeenCalledWith(
    "/api/sams/students",
    expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dto),
    })
  )
})
