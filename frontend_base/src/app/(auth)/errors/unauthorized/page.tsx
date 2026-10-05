import Link from "next/link"
export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign in again</h1>
      <p>Your session has expired. Sign in to continue.</p>
      <Link className="underline" href="/sign-in">
        Sign in
      </Link>
      <Link className="underline" href="/home">
        Open workspace
      </Link>
      <form action="/logout" method="post">
        <button className="rounded-lg border p-3" type="submit">
          Sign out
        </button>
      </form>
    </main>
  )
}
