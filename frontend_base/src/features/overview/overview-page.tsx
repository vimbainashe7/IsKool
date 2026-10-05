import {
  Banknote,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const metrics = [
  {
    label: "Learners",
    value: "1,284",
    helper: "42 new this term",
    icon: GraduationCap,
  },
  {
    label: "Staff",
    value: "86",
    helper: "11 departments",
    icon: Users,
  },
  {
    label: "Attendance",
    value: "94.8%",
    helper: "Today across all classes",
    icon: UserCheck,
  },
  {
    label: "Fees Collected",
    value: "78%",
    helper: "Current billing cycle",
    icon: Banknote,
  },
]

const modules = [
  {
    title: "Academics",
    description:
      "Classes, subjects, assessment schedules, and learner progress.",
    icon: BookOpen,
    status: "Ready for API",
  },
  {
    title: "Attendance",
    description:
      "Daily registers, late arrivals, absences, and guardian follow-up.",
    icon: CalendarCheck,
    status: "Model first",
  },
  {
    title: "Communication",
    description:
      "Messages for guardians, staff notices, and school announcements.",
    icon: MessageSquare,
    status: "Queue backed",
  },
]

const workQueue = [
  "Define learner and guardian profiles",
  "Map attendance register workflow",
  "Connect fee balances to backend ledger",
  "Add role permissions for admins, teachers, and clerks",
]

export function OverviewPage() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            IsKool Control Center
          </Badge>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              School overview
            </h1>
            <p className="text-muted-foreground">
              A clean frontend starting point for enrollment, attendance, fees,
              and communications.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Import Data</Button>
          <Button>New Learner</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <CardTitle>Backend-ready modules</CardTitle>
            </div>
            <CardDescription>
              Frontend domains are separated so API adapters can be introduced
              without rewriting screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {modules.map((module) => (
              <div key={module.title} className="rounded-lg border p-4">
                <module.icon className="mb-4 size-5 text-primary" />
                <div className="space-y-2">
                  <h2 className="font-semibold">{module.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                  <Badge variant="outline">{module.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Readiness</CardTitle>
            <CardDescription>
              Current frontend foundation score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>UI shell</span>
                <span className="font-medium">70%</span>
              </div>
              <Progress value={70} />
            </div>
            <div className="space-y-3">
              {workQueue.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 size-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
