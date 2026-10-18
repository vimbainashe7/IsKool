import { LoginForm1 } from "./components/login-form-1"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { headers } from "next/headers"
import { developmentAccountsEnabled } from "@/lib/auth/development-accounts"

export default async function Page() {
  const developmentAccounts = developmentAccountsEnabled(await headers())
  return (
    <div className="iskool-surface flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-iskool-cream bg-white/85 shadow-[0_28px_80px_rgba(4,9,61,0.14)] md:grid-cols-[1fr_420px]">
        <section className="hidden bg-iskool-navy p-10 text-iskool-cream md:flex md:flex-col md:justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="flex size-11 items-center justify-center rounded-xl bg-iskool-cream text-iskool-navy">
              <Logo size={28} />
            </span>
            IsKool
          </Link>
          <div className="space-y-4">
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
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {["Student", "Teacher", "Admin"].map((role) => (
              <span
                key={role}
                className="rounded-xl border border-iskool-cream/15 bg-iskool-cream/10 px-3 py-2"
              >
                {role}
              </span>
            ))}
          </div>
        </section>
        <div className="flex w-full flex-col gap-6 p-6 md:p-8">
          <Link
            href="/"
            className="flex items-center gap-2 self-center font-medium md:hidden"
          >
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
              <Logo size={24} />
            </div>
            IsKool
          </Link>
          <LoginForm1 developmentAccounts={developmentAccounts} />
        </div>
      </div>
    </div>
  )
}
