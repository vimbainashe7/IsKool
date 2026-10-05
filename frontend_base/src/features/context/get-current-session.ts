import { cache } from "react"
import { cookies } from "next/headers"

import {
  canUseDemoSession,
  createDemoSession,
  demoSessionCookie,
} from "@/dev/demo-session"
import type { SessionContract } from "@/features/context/session-contract"
import {
  capabilitiesForRoles,
  type RoleKey,
} from "@/lib/permissions/capabilities"
import { createClient } from "@/lib/supabase/server"

const allowedRoles = new Set<RoleKey>(["student", "teacher", "admin"])

type MembershipRow = {
  id: string
  school_id: string
  schools?: { id: string; name: string } | { id: string; name: string }[] | null
  membership_roles?: { role_key: string }[] | null
}

export const getCurrentSession = cache(
  async (): Promise<SessionContract | null> => {
    const cookieStore = await cookies()
    const supabase = await createClient()

    if (!supabase) {
      const demoRole = cookieStore.get(demoSessionCookie)?.value as
        RoleKey | undefined
      if (canUseDemoSession() && demoRole && allowedRoles.has(demoRole)) {
        const requestedRole = cookieStore.get("iskool-active-role")?.value as
          RoleKey | undefined
        const activeRole =
          requestedRole &&
          createDemoSession(demoRole).context.roles.includes(requestedRole)
            ? requestedRole
            : demoRole

        return createDemoSession(demoRole, activeRole)
      }

      return null
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("school_memberships")
        .select("id, school_id, schools(id, name), membership_roles(role_key)")
        .eq("profile_id", user.id)
        .eq("status", "active"),
    ])

    const membership = (memberships as MembershipRow[] | null)?.[0]
    if (!membership) {
      return null
    }

    const roles = Array.from(
      new Set(
        (membership.membership_roles ?? [])
          .map((role) => role.role_key)
          .filter((role): role is RoleKey => allowedRoles.has(role as RoleKey))
      )
    )

    if (roles.length === 0) {
      return null
    }

    const requestedRole = cookieStore.get("iskool-active-role")?.value as
      RoleKey | undefined
    const activeRole =
      requestedRole && roles.includes(requestedRole) ? requestedRole : roles[0]
    const school = Array.isArray(membership.schools)
      ? membership.schools[0]
      : membership.schools

    return {
      status: "supabase",
      context: {
        user: {
          id: user.id,
          name: String(profile?.full_name ?? user.email ?? "IsKool user"),
          avatarUrl: profile?.avatar_url ?? "",
        },
        school: {
          id: membership.school_id,
          name: school?.name ?? "Current school",
        },
        membershipId: membership.id,
        roles,
        activeRole,
        capabilities: capabilitiesForRoles([activeRole]),
      },
    }
  }
)
