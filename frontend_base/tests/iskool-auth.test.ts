import { describe, expect, it } from "vitest"

import { toSessionContract } from "@/lib/iskool-auth/session"

const context = {
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.test",
    displayName: "Ada Admin",
  },
  school: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Alpha School",
  },
  membershipId: "33333333-3333-4333-8333-333333333333",
  roles: ["admin", "teacher"],
}

describe("IsKool session mapping", () => {
  it("honors an allowed active role and derives only its capabilities", () => {
    const session = toSessionContract(context, "teacher")
    expect(session?.status).toBe("iskool")
    expect(session?.context.activeRole).toBe("teacher")
    expect(session?.context.roles).toEqual(["admin", "teacher"])
    expect(session?.context.capabilities).toContain("assignments.manage")
    expect(session?.context.capabilities).not.toContain("users.manage")
  })

  it("rejects contexts without a supported product role", () => {
    expect(toSessionContract({ ...context, roles: ["owner"] })).toBeNull()
  })

  it("ignores an admin selection when the verified membership only permits student", () => {
    const session = toSessionContract({ ...context, roles: ["student"] }, "admin")
    expect(session?.context.activeRole).toBe("student")
    expect(session?.context.roles).toEqual(["student"])
    expect(session?.context.capabilities).not.toContain("users.manage")
  })
})
