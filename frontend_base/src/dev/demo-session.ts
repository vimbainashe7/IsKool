import type { SessionContract } from "@/features/context/session-contract"
import { capabilitiesForRoles, type RoleKey } from "@/lib/permissions/capabilities"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export const demoSessionCookie = "iskool-demo-role"

export function canUseDemoSession() {
  return process.env.NODE_ENV !== "production" && !isSupabaseConfigured()
}

export function createDemoSession(role: RoleKey, activeRole = role): SessionContract {
  return {
    status: "unconfigured",
    context: {
      user: {
        id: `demo-${activeRole}`,
        name: `Demo ${activeRole[0].toUpperCase()}${activeRole.slice(1)}`,
        avatarUrl: "",
      },
      school: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Vimbainashe High School",
        brandColor: "#2a4178",
      },
      membershipId: `00000000-0000-0000-0000-0000000000${activeRole === "student" ? "11" : activeRole === "teacher" ? "22" : "33"}`,
      roles: ["student", "teacher", "admin"],
      activeRole,
      capabilities: capabilitiesForRoles([activeRole]),
    },
  }
}
