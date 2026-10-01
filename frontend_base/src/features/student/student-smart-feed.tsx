import { ArrowDownToLine, Bot, CalendarDays, CheckCircle2, FileText, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const feedItems = [
  { title: "Mathematics homework", type: "Assignment", status: "Due today", icon: FileText },
  { title: "Computer Science quiz", type: "Test", status: "Available", icon: CheckCircle2 },
  { title: "English comprehension pack", type: "Notes", status: "New material", icon: ArrowDownToLine },
]

export function StudentSmartFeed() {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <div className="rounded-[2rem] bg-iskool-midnight p-8 text-iskool-cream shadow-[0_24px_60px_rgba(4,9,61,0.20)]">
          <Badge className="bg-iskool-blue/45 text-iskool-cream hover:bg-iskool-blue/45">Student feed</Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-normal">Everything you need, in order</h1>
          <p className="mt-3 max-w-2xl text-lg text-iskool-cream/80">
            View notes, download assignments and tests, submit work, and revise with the AI study buddy.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {feedItems.map((item) => (
            <Card className="border-iskool-cream bg-white" key={item.title}>
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-iskool-cream text-iskool-navy">
                  <item.icon className="size-5" />
                </div>
                <CardTitle className="text-lg text-iskool-midnight">{item.title}</CardTitle>
                <CardDescription>{item.type}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Badge className="w-fit bg-iskool-blue text-iskool-cream hover:bg-iskool-blue">{item.status}</Badge>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">
                    <ArrowDownToLine />
                    Download
                  </Button>
                  <Button className="flex-1">
                    <Send />
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <aside className="grid gap-4">
        <Card className="border-iskool-cream bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-iskool-midnight">
              <Bot className="size-5" />
              AI study buddy
            </CardTitle>
            <CardDescription>Ask questions from teacher-approved notes and revision packs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Weekly revision</span>
                <span>72%</span>
              </div>
              <Progress value={72} />
            </div>
            <Button className="w-full">Start revision</Button>
          </CardContent>
        </Card>
        <Card className="border-iskool-cream bg-iskool-cream/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-iskool-midnight">
              <CalendarDays className="size-5" />
              Calendar sync
            </CardTitle>
            <CardDescription>Assignments, tests, and revision deadlines appear as one timeline.</CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </section>
  )
}
