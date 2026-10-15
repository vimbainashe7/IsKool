import type { Capability, RoleKey } from "@/lib/permissions/capabilities"

export type IsKoolContext = {
  user: {
    id: string
    name: string
    avatarUrl?: string
  }
  school: {
    id: string
    name: string
    logoUrl?: string
    brandColor?: string
  }
  membershipId?: string
  roles: RoleKey[]
  capabilities: Capability[]
  activeRole: RoleKey
}

export type SessionContractStatus = "iskool" | "supabase" | "unconfigured"

export type SessionContract = {
  status: SessionContractStatus
  context: IsKoolContext
}
