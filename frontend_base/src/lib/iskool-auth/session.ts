import type { SessionContract } from "@/features/context/session-contract"
import {
  capabilitiesForRoles,
  type RoleKey,
} from "@/lib/permissions/capabilities"
import type { IsKoolContextResponse } from "./server"

const allowedRoles = new Set<RoleKey>(["student", "teacher", "admin"])

export function toSessionContract(
  source: IsKoolContextResponse,
  requestedRole?: string
): SessionContract | null {
  const roles = source.roles.filter((role): role is RoleKey =>
    allowedRoles.has(role as RoleKey)
  )
  if (roles.length === 0) return null
  const activeRole = roles.includes(requestedRole as RoleKey)
    ? (requestedRole as RoleKey)
    : roles[0]
  return {
    status: "iskool",
    context: {
      user: { id: source.user.id, name: source.user.displayName },
      school: { id: source.school.id, name: source.school.name },
      membershipId: source.membershipId,
      roles,
      activeRole,
      capabilities: capabilitiesForRoles([activeRole]),
    },
  }
}
