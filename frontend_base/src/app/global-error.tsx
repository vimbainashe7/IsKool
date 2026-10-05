"use client"
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <h1>IsKool could not load</h1>
        <p>Try again shortly.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
