export function SiteFooter({ schoolName = "IsKool" }: { schoolName?: string }) {
  return (
    <footer className="border-t px-5 py-4 text-center text-xs text-muted-foreground">
      {schoolName} · Your school workspace
    </footer>
  )
}
