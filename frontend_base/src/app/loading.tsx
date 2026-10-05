export default function Loading() {
  return (
    <div className="iskool-surface flex min-h-screen items-center justify-center">
      <div className="rounded-2xl border border-iskool-cream bg-white/85 px-8 py-7 text-center shadow-[0_18px_55px_rgba(4,9,61,0.1)]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-iskool-cream border-b-iskool-navy" />
        <p className="text-muted-foreground mt-3 text-sm font-medium">
          Loading IsKool...
        </p>
      </div>
    </div>
  )
}
