export function SiteFooter() {
  return (
    <footer className="border-t border-iskool-cream/80 bg-iskool-cream/35">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm font-medium text-iskool-midnight">
            <span>IsKool school operations workspace</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Frontend shell prepared for clean backend integration.
          </p>
        </div>
      </div>
    </footer>
  )
}
