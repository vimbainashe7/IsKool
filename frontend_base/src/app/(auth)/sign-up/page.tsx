import { SignupForm1 } from "./components/signup-form-1"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <div className="iskool-surface flex min-h-svh flex-col items-center justify-center gap-3 p-3 md:p-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-iskool-navy text-iskool-cream flex size-8 items-center justify-center rounded-md">
            <Logo size={24} />
          </div>
          IsKool
        </Link>
        <SignupForm1 />
      </div>
    </div>
  )
}
