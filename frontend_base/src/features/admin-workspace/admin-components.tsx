"use client"
import { createContext, useContext, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, CircleHelp, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import { hasCapability, type Capability } from "@/lib/permissions/capabilities"
import styles from "./admin-workspace.module.css"

const Access = createContext<readonly Capability[]>([])
export function AdminRetry() {
  const { refresh } = useWorkspace()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError("")
          try {
            await refresh()
          } catch {
            setError(
              "School records could not be refreshed. Try again shortly."
            )
          } finally {
            setPending(false)
          }
        }}
      >
        {pending ? "Refreshing…" : "Retry loading records"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
export function AdminAccess({
  capabilities,
  children,
}: {
  capabilities: readonly Capability[]
  children: ReactNode
}) {
  return <Access.Provider value={capabilities}>{children}</Access.Provider>
}
export function useAdminAccess() {
  return useContext(Access)
}
export function AdminLink({
  href,
  capability,
  children,
  className,
  onClick,
}: {
  href: string
  capability: Capability
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const capabilities = useAdminAccess()
  return hasCapability(capabilities, capability) ? (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  ) : null
}
export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>School administration</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  )
}
export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  capability,
}: {
  label: string
  value: number | string | null
  detail: string
  icon: LucideIcon
  href?: string
  capability?: Capability
}) {
  const capabilities = useAdminAccess()
  const body = (
    <>
      <div className={styles.metricTop}>
        <span className={styles.icon}>
          <Icon size={22} aria-hidden="true" />
        </span>
        <strong
          className={
            value === null || typeof value === "string"
              ? styles.metricText
              : undefined
          }
        >
          {value ?? "Unavailable"}
        </strong>
      </div>
      <h2>{label}</h2>
      <p>{detail}</p>
    </>
  )
  return (
    <Card className={styles.metric}>
      {href && capability && hasCapability(capabilities, capability) ? (
        <AdminLink
          href={href}
          capability={capability}
          className={styles.metricLink}
        >
          {body}
          <ArrowUpRight
            className={styles.metricArrow}
            size={14}
            aria-hidden="true"
          />
        </AdminLink>
      ) : (
        body
      )}
    </Card>
  )
}
export function AdminSectionCard({
  title,
  description,
  children,
  href,
  capability,
  action = "View all",
  className = "",
}: {
  title: string
  description?: string
  children: ReactNode
  href?: string
  capability?: Capability
  action?: string
  className?: string
}) {
  return (
    <Card className={`${styles.section} ${className}`}>
      <div className={styles.sectionHeading}>
        <h2>{title}</h2>
        {href && capability && (
          <AdminLink href={href} capability={capability}>
            {action}
            <ArrowUpRight size={14} aria-hidden="true" />
          </AdminLink>
        )}
      </div>
      {description && <p className={styles.note}>{description}</p>}
      {children}
    </Card>
  )
}
export function AdminEmptyState({
  title,
  children,
  icon: Icon = CircleHelp,
}: {
  title: string
  children: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <h3>{title}</h3>
        <div className={styles.note}>{children}</div>
      </div>
    </div>
  )
}
export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`${styles.badge} ${status === "invited" || status === "Unassigned" ? styles.pending : status === "suspended" ? styles.danger : ""}`}
    >
      {status}
    </span>
  )
}
export function AdminListRow({
  title,
  detail,
  href,
  capability,
  children,
}: {
  title: string
  detail: string
  href?: string
  capability?: Capability
  children?: ReactNode
}) {
  const body = (
    <>
      <div className={styles.rowText}>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {children}
      {href && <ArrowUpRight size={15} aria-hidden="true" />}
    </>
  )
  return (
    <li className={styles.listItem}>
      {href && capability ? (
        <AdminLink href={href} capability={capability} className={styles.row}>
          {body}
        </AdminLink>
      ) : (
        <div className={styles.row}>{body}</div>
      )}
    </li>
  )
}
