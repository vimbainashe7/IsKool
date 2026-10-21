"use client"
import { useState } from "react"
import { LoginForm1, type DevelopmentAccountSelection } from "./login-form-1"
import { Logo } from "@/components/logo"
import Link from "next/link"
export function SignInScreen({
  developmentAccounts,
}: {
  developmentAccounts: boolean
}) {
  const [accountSelection, setAccountSelection] =
    useState<DevelopmentAccountSelection>()
  const [busy, setBusy] = useState(false)
  return (
    <div className="iskool-surface flex min-h-svh flex-col items-center justify-center gap-3 p-3 md:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-iskool-cream bg-white/85 shadow-[0_28px_80px_rgba(4,9,61,0.14)] md:grid-cols-[1fr_420px]">
        <section
          className={`${developmentAccounts ? "flex" : "hidden md:flex"} order-2 flex-col bg-iskool-navy p-3 text-iskool-cream md:order-1 md:min-h-[500px] md:justify-between md:p-8`}
        >
          <Link
            href="/"
            className="hidden items-center gap-3 font-semibold md:flex"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-iskool-cream text-iskool-navy">
              <Logo size={28} />
            </span>
            IsKool
          </Link>
          <div className="hidden space-y-4 md:block">
            <p className="text-sm font-semibold uppercase tracking-wide text-iskool-cream/65">
              One school platform
            </p>
            <h1 className="max-w-md text-4xl font-bold tracking-tight">
              Student, teacher, and admin workspaces in one account.
            </h1>
            <p className="max-w-md text-sm leading-6 text-iskool-cream/75">
              Sign in once. Your school membership, roles, and permissions shape
              the workspace you can access.
            </p>
          </div>
          <div
            className="grid grid-cols-3 gap-2 text-center text-xs"
            role={developmentAccounts ? "group" : undefined}
            aria-label={
              developmentAccounts ? "Select development account" : undefined
            }
          >
            {(["Student", "Teacher", "Admin"] as const).map((role) =>
              developmentAccounts ? (
                <button
                  key={role}
                  type="button"
                  disabled={busy}
                  aria-pressed={accountSelection?.role === role}
                  className={`rounded-xl border border-iskool-cream/30 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iskool-cream disabled:opacity-50 ${accountSelection?.role === role ? "bg-iskool-cream text-iskool-navy" : "bg-iskool-cream/10 hover:bg-iskool-cream/20"}`}
                  onClick={() => setAccountSelection({ role })}
                >
                  {role}
                </button>
              ) : (
                <span
                  key={role}
                  className="rounded-xl border border-iskool-cream/15 bg-iskool-cream/10 px-3 py-2"
                >
                  {role}
                </span>
              )
            )}
          </div>
        </section>
        <div className="order-1 flex w-full flex-col gap-3 p-4 md:order-2 md:p-6">
          <Link
            href="/"
            className="flex items-center gap-2 self-center font-medium md:hidden"
          >
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
              <Logo size={24} />
            </div>
            IsKool
          </Link>
          <LoginForm1
            developmentAccounts={developmentAccounts}
            accountSelection={accountSelection}
            onBusyChange={setBusy}
          />
        </div>
      </div>
    </div>
  )
}
