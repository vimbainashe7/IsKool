import { AlertTriangle, CalendarClock, FileCheck2, Route, ShieldCheck, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const exceptions = [
  { title: "Two classes have no teacher assigned", owner: "Timetable", severity: "High" },
  { title: "14 report cards waiting for approval", owner: "Reports", severity: "Medium" },
  { title: "Attendance below threshold in Form 3B", owner: "Attendance", severity: "Medium" },
]

export function AdminExceptionCommandDashboard() {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-6">
        <div className="rounded-[2rem] bg-iskool-midnight p-8 text-iskool-cream">
          <Badge className="bg-iskool-blue/45 text-iskool-cream hover:bg-iskool-blue/45">Admin command</Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-normal">Run the school by exception</h1>
          <p className="mt-3 max-w-2xl text-lg text-iskool-cream/80">
            Admins manage people, timetables, reports, alerts, and school settings. Academic content creation stays with teachers.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Route, label: "Generate timetable", value: "Ready" },
            { icon: FileCheck2, label: "Report cards", value: "14 pending" },
            { icon: Users, label: "Staff coverage", value: "96%" },
          ].map((item) => (
            <Card className="border-iskool-cream bg-white" key={item.label}>
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-iskool-cream text-iskool-navy">
                  <item.icon className="size-5" />
                </div>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-2xl text-iskool-midnight">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="border-iskool-cream bg-white">
          <CardHeader>
            <CardTitle className="text-iskool-midnight">Exception queue</CardTitle>
            <CardDescription>Alerts that need an admin decision before the day continues.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {exceptions.map((item) => (
              <div className="flex items-center justify-between rounded-xl border border-iskool-cream bg-iskool-cream/25 p-4" key={item.title}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-5 text-iskool-blue" />
                  <div>
                    <p className="font-medium text-iskool-midnight">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.owner}</p>
                  </div>
                </div>
                <Badge className="bg-iskool-navy text-iskool-cream hover:bg-iskool-navy">{item.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="grid gap-4">
        <Card className="border-iskool-cream bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-iskool-midnight">
              <CalendarClock className="size-5" />
              Automation runs
            </CardTitle>
            <CardDescription>Queue school-wide jobs without touching teacher academic content.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button>Run timetable generator</Button>
            <Button variant="outline">Prepare report cards</Button>
            <Button variant="outline">Send guardian reminders</Button>
          </CardContent>
        </Card>
        <Card className="border-iskool-cream bg-iskool-cream/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-iskool-midnight">
              <ShieldCheck className="size-5" />
              Role boundary
            </CardTitle>
            <CardDescription>
              Admins configure the school and approve operations. Teachers create assignments, tests, revision tests, and notes.
            </CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </section>
  )
}
