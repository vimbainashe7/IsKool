import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, BookOpen } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import styles from "./teacher-workspace.module.css"

export function TeacherPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>Teacher workspace</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  )
}
export function TeacherSectionCard({
  title,
  children,
  href,
  linkLabel = "See all",
}: {
  title: string
  children: ReactNode
  href?: string
  linkLabel?: string
}) {
  return (
    <Card className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2>{title}</h2>
        {href && (
          <Link href={href}>
            {linkLabel}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </Card>
  )
}
export function TeacherSummaryCard({
  label,
  value,
  detail,
  icon: Icon = BookOpen,
}: {
  label: string
  value: number | string
  detail?: string
  icon?: LucideIcon
}) {
  return (
    <Card className={styles.summary}>
      <span className={styles.icon}>
        <Icon size={21} aria-hidden="true" />
      </span>
      <div>
        <p>{label}</p>
        <strong
          className={typeof value === "string" ? styles.summaryText : undefined}
        >
          {value}
        </strong>
        {detail && <small>{detail}</small>}
      </div>
    </Card>
  )
}
export function TeacherEmptyState({
  children,
  href,
  action,
}: {
  children: ReactNode
  href?: string
  action?: string
}) {
  return (
    <div className={styles.empty}>
      <BookOpen size={24} aria-hidden="true" />
      <p>{children}</p>
      {href && (
        <Link href={href}>
          {action ?? "Open workspace"}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
export function TeacherRow({
  title,
  detail,
  href,
  icon: Icon = BookOpen,
  status,
}: {
  title: string
  detail?: string
  href?: string
  icon?: LucideIcon
  status?: string
}) {
  const content = (
    <>
      <span className={styles.icon}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className={styles.rowText}>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
        {status && <span className={styles.status}>{status}</span>}
      </span>
      {href && <ArrowUpRight size={16} aria-hidden="true" />}
    </>
  )
  return (
    <li>
      {href ? (
        <Link className={styles.row} href={href}>
          {content}
        </Link>
      ) : (
        <div className={styles.row}>{content}</div>
      )}
    </li>
  )
}
