import {
  ArrowRight,
  Atom,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  FileText,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  Library,
  Mail,
  MoreVertical,
  NotebookTabs,
  Search,
  ShieldCheck,
  Sigma,
  UserCog,
  Users,
  WandSparkles,
} from "lucide-react"
import Link from "next/link"

import { SchoolLogo } from "@/components/school-logo"
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
import type { IsKoolContext } from "@/features/context/session-contract"
import type {
  AdminDashboardData,
  StudentDashboardData,
  TeacherDashboardData,
} from "@/features/dashboards/dashboard-data"

function SourceBadge({ source }: { source: "supabase" | "fixture" }) {
  return (
    <Badge variant={source === "supabase" ? "default" : "secondary"}>
      {source === "supabase" ? "Live Supabase" : "Fixture fallback"}
    </Badge>
  )
}

const studentSubjects = [
  {
    name: "Mathematics",
    teacher: "Mrs. Moyo",
    progress: 82,
    lessons: 4,
    icon: Sigma,
    tone: "bg-iskool-cream text-iskool-navy",
    art: "from-iskool-cream to-white",
  },
  {
    name: "Computer Science",
    teacher: "Mr. Ncube",
    progress: 74,
    lessons: 3,
    icon: Code2,
    tone: "bg-iskool-blue/10 text-iskool-blue",
    art: "from-iskool-blue/15 to-iskool-cream",
  },
  {
    name: "English",
    teacher: "Ms. Dube",
    progress: 68,
    lessons: 5,
    icon: BookOpen,
    tone: "bg-iskool-midnight/10 text-iskool-midnight",
    art: "from-iskool-midnight/10 to-white",
  },
]

const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1)
const markedDays = new Set([8, 16, 19, 24])
const today = 29

const upcomingTasks = [
  {
    group: "TODAY",
    items: [
      { title: "Mathematics Homework", subject: "Mathematics", icon: Sigma, tone: "bg-iskool-cream text-iskool-navy" },
      { title: "Computer Science Quiz", subject: "Computer Science", icon: Code2, tone: "bg-iskool-blue/10 text-iskool-blue" },
    ],
  },
  {
    group: "THIS WEEK",
    items: [
      { title: "English Essay", subject: "English", icon: FileText, tone: "bg-iskool-midnight/10 text-iskool-midnight" },
      { title: "Science Practical", subject: "Integrated Science", icon: Atom, tone: "bg-iskool-blue/15 text-iskool-navy" },
    ],
  },
]

function firstName(name: string) {
  return name.split(" ")[0] || "Student"
}

export function StudentDashboard({
  data,
  context,
}: {
  data: StudentDashboardData
  context: IsKoolContext
}) {
  const displayDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="px-3 lg:px-6">
      <div className="rounded-[28px] border border-iskool-cream bg-iskool-cream/55 p-4 shadow-sm lg:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-7">
            <section className="relative overflow-hidden rounded-[24px] bg-iskool-navy px-7 py-8 text-iskool-cream shadow-[0_18px_45px_rgba(4,9,61,0.2)]">
              <div className="relative z-10 max-w-xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-white/15 text-white hover:bg-white/15">
                    {displayDate}
                  </Badge>
                  <SourceBadge source={data.source} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Good afternoon, {firstName(context.user.name)}
                </h1>
                <p className="text-sm text-iskool-cream/85">
                  Here&apos;s what&apos;s happening with your learning today.
                </p>
              </div>
              <div className="absolute right-7 top-7 hidden h-28 w-36 rotate-[-8deg] rounded-[28px] bg-iskool-cream/15 shadow-2xl md:block" />
              <div className="absolute right-16 top-11 hidden size-20 items-center justify-center rounded-2xl bg-iskool-cream/25 p-3 md:flex">
                <SchoolLogo school={context.school} showName={false} markClassName="size-14 rounded-2xl border-iskool-cream/20" />
              </div>
              <div className="absolute bottom-[-34px] right-[-18px] size-32 rounded-full bg-iskool-cream/10" />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">My Subjects</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/classes">
                    View all
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {studentSubjects.map((subject) => {
                  const Icon = subject.icon
                  return (
                    <Card
                      key={subject.name}
                      className="overflow-hidden rounded-[20px] border-white/80 bg-white py-0 shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
                    >
                      <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${subject.art}`}>
                        <div className={`flex size-16 items-center justify-center rounded-2xl ${subject.tone}`}>
                          <Icon className="size-9" />
                        </div>
                      </div>
                      <CardContent className="space-y-4 p-5">
                        <div>
                          <h3 className="font-bold">{subject.name}</h3>
                          <p className="text-xs text-muted-foreground">{subject.teacher}</p>
                        </div>
                        <div className="space-y-2">
                          <Progress value={subject.progress} className="h-2 bg-iskool-cream" />
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Lessons left: {subject.lessons}</span>
                            <span>{subject.progress}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Academic Overview</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-[20px] border-iskool-cream bg-iskool-cream py-0 shadow-[0_14px_35px_rgba(4,9,61,0.06)]">
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-iskool-blue">Attendance</p>
                      <div className="text-4xl font-bold text-iskool-navy">92%</div>
                      <p className="text-sm text-iskool-midnight/75">Excellent attendance this term</p>
                    </div>
                    <div className="flex size-20 items-center justify-center rounded-2xl bg-white/75 text-iskool-blue">
                      <CheckCircle2 className="size-10" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-[20px] border-iskool-blue/20 bg-iskool-blue/10 py-0 shadow-[0_14px_35px_rgba(4,9,61,0.06)]">
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-iskool-blue">Overall Performance</p>
                      <div className="text-4xl font-bold text-iskool-navy">78%</div>
                      <p className="text-sm text-iskool-midnight/75">Up 4% from last month</p>
                    </div>
                    <div className="flex size-20 items-center justify-center rounded-2xl bg-white/75 text-iskool-blue">
                      <GraduationCap className="size-10" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </main>

          <aside className="space-y-6 rounded-[24px] bg-white/70 p-4 xl:p-5">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">My Schedule</h2>
                <CalendarDays className="size-5 text-iskool-blue" />
              </div>
              <Card className="rounded-[20px] border-white/80 bg-white py-0 shadow-[0_14px_35px_rgba(15,23,42,0.07)]">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between text-sm font-semibold">
                    <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
                    <span>September</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                      <span key={`${day}-${index}`} className="font-semibold text-iskool-blue">
                        {day}
                      </span>
                    ))}
                    {calendarDays.map((day) => (
                      <span
                        key={day}
                        className={
                          day === today
                            ? "flex aspect-square items-center justify-center rounded-full bg-iskool-navy font-semibold text-iskool-cream"
                            : markedDays.has(day)
                              ? "flex aspect-square items-center justify-center rounded-full bg-iskool-cream text-iskool-blue"
                              : "flex aspect-square items-center justify-center text-muted-foreground"
                        }
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Upcoming</h2>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  See all
                </Button>
              </div>
              <div className="space-y-5">
                {upcomingTasks.map((group) => (
                  <div key={group.group} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">{group.group}</p>
                    {group.items.map((task) => {
                      const Icon = task.icon
                      return (
                        <div
                          key={task.title}
                          className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
                        >
                          <div className={`flex size-11 items-center justify-center rounded-xl ${task.tone}`}>
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{task.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{task.subject}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </section>

            <Button asChild className="w-full rounded-2xl">
              <Link href="/student/assignments/demo-assignment">
                Submit assignment
                <FileUp className="size-4" />
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </div>
  )
}

export function TeacherDashboard({
  data,
  context,
}: {
  data: TeacherDashboardData
  context: IsKoolContext
}) {
  const teacherName = context.user.name
  const displayMonth = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date())
  const quickActions = [
    { label: "My Classes", href: "/classes", icon: Users, value: data.classes.length },
    { label: "Assignments", href: "/assignments", icon: FileText, value: data.assignmentActions.length },
    { label: "Materials", href: "/teacher/materials", icon: FileUp, value: data.materialActions.length },
    { label: "AI Workspace", href: "/teacher/ai", icon: WandSparkles, value: data.aiTools.length },
  ]
  const metricCards = [
    { label: "Classes", value: data.classes.length, icon: Users, tone: "bg-iskool-cream text-iskool-navy" },
    { label: "Assignments", value: data.assignmentActions.length, icon: FileText, tone: "bg-iskool-blue/10 text-iskool-blue" },
    { label: "Submissions", value: data.submissions.length, icon: NotebookTabs, tone: "bg-iskool-midnight/10 text-iskool-midnight" },
  ]
  const teacherNav = [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard, active: true },
    { label: "Classes", href: "/classes", icon: Users },
    { label: "Assignments", href: "/assignments", icon: FileText },
    { label: "Attendance", href: "/attendance", icon: CheckCircle2 },
    { label: "Teacher Materials", href: "/teacher/materials", icon: Library },
    { label: "AI Workspace", href: "/teacher/ai", icon: WandSparkles },
  ]

  return (
    <div className="px-3 lg:px-6">
      <div className="mx-auto grid max-w-[1480px] gap-5 rounded-[26px] border border-iskool-cream bg-iskool-cream/45 p-4 shadow-sm xl:grid-cols-[230px_minmax(0,1fr)_300px] xl:p-5">
        <aside className="hidden rounded-[22px] border border-iskool-cream bg-white p-5 shadow-[0_2px_14px_rgba(4,9,61,0.035)] xl:block">
          <SchoolLogo school={context.school} subtitle="Teacher workspace" className="mb-10" />
          <nav className="space-y-8">
            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Workspace</p>
              {teacherNav.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      item.active
                        ? "relative flex h-11 items-center gap-3 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary"
                        : "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-iskool-midnight/70 hover:bg-iskool-cream/55 hover:text-iskool-navy"
                    }
                  >
                    {item.active && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-primary" />}
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Communication</p>
              <Link href="/notifications" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-iskool-midnight/70 hover:bg-iskool-cream/55">
                <Bell className="size-4" />
                Notifications
              </Link>
              <Link href="/reports" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-iskool-midnight/70 hover:bg-iskool-cream/55">
                <Mail className="size-4" />
                Reports
              </Link>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 rounded-[20px] border border-iskool-cream bg-white p-4 shadow-[0_2px_14px_rgba(4,9,61,0.035)] md:flex-row md:items-center md:justify-between">
            <Link
              href="/search"
              className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-iskool-cream bg-iskool-cream/35 px-4 text-sm text-muted-foreground md:max-w-md"
            >
              <Search className="size-4" />
              <span className="truncate">Search students, classes, subjects...</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" aria-label="Notifications" className="rounded-xl">
                <Bell className="size-4" />
              </Button>
              <div className="flex items-center gap-3 rounded-xl border border-iskool-cream px-3 py-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {firstName(teacherName)[0]}
                </div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold">{teacherName}</p>
                  <p className="text-xs text-muted-foreground">Teacher</p>
                </div>
                <ChevronRight className="size-4 rotate-90 text-muted-foreground" />
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[20px] border border-primary/10 bg-primary/10 p-6 shadow-[0_2px_14px_rgba(15,23,42,0.035)] md:min-h-40">
            <div className="relative z-10 max-w-xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={data.source} />
                <Badge variant="outline" className="bg-white/60">{displayMonth}</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Good morning, {firstName(teacherName)}!
              </h1>
              <p className="text-sm text-muted-foreground">Have a productive day at school.</p>
              {data.submissions[0] && <p className="text-sm font-medium text-primary">{data.submissions[0]}</p>}
            </div>
            <div className="absolute right-8 top-8 hidden size-28 rounded-[28px] bg-white/70 shadow-sm md:block" />
            <div className="absolute right-14 top-14 hidden size-16 items-center justify-center rounded-2xl bg-iskool-cream text-iskool-navy md:flex">
              <BookOpen className="size-9" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-2xl border border-iskool-cream bg-white p-4 shadow-[0_2px_14px_rgba(4,9,61,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(4,9,61,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <p className="text-sm font-semibold">{action.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{action.value} available</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {metricCards.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.label} className="rounded-2xl border-iskool-cream bg-white py-0 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex size-12 items-center justify-center rounded-xl ${metric.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl border-iskool-cream bg-white py-0 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today&apos;s Classes</CardTitle>
                <CardDescription>All currently available class entries remain visible.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {(data.classes.length ? data.classes : ["No classes visible yet."]).map((item, index) => (
                  <div key={`${item}-${index}`} className="flex min-h-16 items-center gap-3 rounded-xl border border-iskool-cream bg-iskool-cream/30 p-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-iskool-cream text-iskool-navy">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item}</p>
                      <p className="text-xs text-muted-foreground">Class workspace</p>
                    </div>
                    <Button asChild variant="ghost" size="icon" aria-label={`Open ${item}`}>
                      <Link href="/classes">
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-iskool-cream bg-white py-0 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Teacher Work</CardTitle>
                <CardDescription>Assignments, grading, and AI tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <CompactList title="Assignments" items={data.assignmentActions} icon={FileText} />
                <CompactList title="Grading" items={data.grading} icon={CheckCircle2} />
                <CompactList title="AI tools" items={data.aiTools} icon={WandSparkles} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-2xl border-iskool-cream bg-white py-0 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Class Overview</CardTitle>
                <CardDescription>Visible classes and available counts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {(data.classes.length ? data.classes : ["No class records yet."]).map((item, index) => (
                  <div key={`${item}-overview-${index}`} className="rounded-xl border border-iskool-cream p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{item}</span>
                      <span className="text-muted-foreground">Active</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Class record visible through the current teacher context.
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-iskool-cream bg-white py-0 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Material Actions</CardTitle>
                <CardDescription>Teacher material workflow remains available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <CompactList title="Materials" items={data.materialActions} icon={FileUp} />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild variant="outline">
                    <Link href="/teacher/materials">
                      Upload material
                      <FileUp className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/teacher/ai">
                      AI workspace
                      <WandSparkles className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <aside className="space-y-5 rounded-[22px] border border-iskool-cream bg-white p-5 shadow-[0_2px_14px_rgba(4,9,61,0.035)]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Schedule</h2>
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div className="rounded-2xl border border-iskool-cream p-4">
              <div className="mb-4 flex items-center justify-between text-sm font-semibold">
                <ChevronRight className="size-4 rotate-180 text-muted-foreground" />
                <span>{displayMonth}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`} className="font-semibold text-muted-foreground">
                    {day}
                  </span>
                ))}
                {calendarDays.slice(0, 30).map((day) => (
                  <span
                    key={`teacher-day-${day}`}
                    className={
                      day === today
                        ? "flex aspect-square items-center justify-center rounded-full bg-primary text-white"
                        : markedDays.has(day)
                          ? "flex aspect-square items-center justify-center rounded-full bg-primary/10 text-primary"
                          : "flex aspect-square items-center justify-center text-muted-foreground"
                    }
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <RightPanelList title="Upcoming" items={[...data.classes, ...data.assignmentActions]} icon={CalendarDays} />
          <RightPanelList title="Notifications" items={data.submissions} icon={Bell} />
          <RightPanelList title="Actions" items={[...data.grading, ...data.materialActions]} icon={CheckCircle2} />
        </aside>
      </div>
    </div>
  )
}

function CompactList({
  title,
  items,
  icon: Icon,
}: {
  title: string
  items: string[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {(items.length ? items : ["No records visible yet."]).map((item) => (
        <div key={`${title}-${item}`} className="flex items-center gap-3 rounded-xl bg-iskool-cream/30 p-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
            <Icon className="size-4" />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{item}</p>
        </div>
      ))}
    </div>
  )
}

function RightPanelList({
  title,
  items,
  icon: Icon,
}: {
  title: string
  items: string[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="space-y-2">
        {(items.length ? items.slice(0, 4) : ["No items available."]).map((item) => (
          <div key={`${title}-${item}`} className="flex items-center gap-3 rounded-2xl border border-iskool-cream p-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item}</p>
              <p className="text-xs text-muted-foreground">Teacher workspace</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function AdminDashboard({
  data,
  context,
}: {
  data: AdminDashboardData
  context: IsKoolContext
}) {
  const adminName = context.user.name
  const adminNav = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, active: true },
    { label: "Students", href: "/students", icon: Users },
    { label: "Classes", href: "/classes", icon: BookOpen },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Audit", href: "/admin/dashboard", icon: Database },
  ]
  const metrics = [
    {
      label: "User records",
      value: data.users.length,
      icon: Users,
      tone: "bg-iskool-cream text-iskool-navy",
    },
    {
      label: "Membership roles",
      value: data.memberships.length,
      icon: UserCog,
      tone: "bg-iskool-blue/10 text-iskool-blue",
    },
    {
      label: "Class records",
      value: data.classes.length,
      icon: BookOpen,
      tone: "bg-iskool-midnight/10 text-iskool-midnight",
    },
    {
      label: "Audit entries",
      value: data.audit.length,
      icon: ShieldCheck,
      tone: "bg-iskool-blue/15 text-iskool-navy",
    },
  ]
  const totalOperationalRecords =
    data.users.length +
    data.memberships.length +
    data.classes.length +
    data.enrollments.length
  const ringUserShare =
    totalOperationalRecords > 0
      ? Math.round((data.users.length / totalOperationalRecords) * 100)
      : 0
  const recordRows = [
    ...data.users.map((item) => ({ type: "User", item })),
    ...data.memberships.map((item) => ({ type: "Membership", item })),
  ]

  return (
    <div className="px-3 lg:px-6">
      <div className="mx-auto grid max-w-[1480px] overflow-hidden rounded-[26px] border border-iskool-cream bg-white shadow-sm xl:grid-cols-[265px_minmax(0,1fr)]">
        <aside className="hidden bg-iskool-navy p-6 text-iskool-cream xl:flex xl:min-h-[780px] xl:flex-col">
          <SchoolLogo school={context.school} subtitle="Admin workspace" inverse className="mb-12" />

          <nav className="flex-1 space-y-2">
            {adminNav.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    item.active
                      ? "flex h-12 items-center gap-3 rounded-lg bg-iskool-cream/12 px-4 text-sm font-semibold text-iskool-cream"
                      : "flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium text-iskool-cream/55 transition hover:bg-iskool-cream/8 hover:text-iskool-cream"
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="space-y-2 border-t border-iskool-cream/10 pt-5">
            <Link href="/settings" className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-iskool-cream/55 hover:bg-iskool-cream/8 hover:text-iskool-cream">
              <ShieldCheck className="size-4" />
              Settings
            </Link>
            <Link href="/logout" className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-iskool-cream/55 hover:bg-iskool-cream/8 hover:text-iskool-cream">
              <ArrowRight className="size-4 rotate-180" />
              Log out
            </Link>
          </div>
        </aside>

        <main className="min-w-0 space-y-6 bg-white p-4 md:p-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={data.source} />
                <Badge variant="outline">Admin</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                User provisioning, memberships, classes, enrollments, and audit foundation.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/search"
                className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-iskool-cream bg-iskool-cream/30 px-4 text-sm text-muted-foreground sm:w-80"
              >
                <Search className="size-4" />
                <span className="truncate">Search admin records...</span>
              </Link>
              <Button variant="outline" size="icon" aria-label="Audit notifications" className="rounded-xl">
                <Bell className="size-4" />
              </Button>
              <div className="flex items-center gap-3 rounded-xl border border-iskool-cream px-3 py-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-iskool-cream text-sm font-bold text-iskool-navy">
                  {firstName(adminName)[0]}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold">{adminName}</p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.label} className="rounded-lg border-0 bg-iskool-cream/35 py-0 shadow-none">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex size-12 items-center justify-center rounded-full ${metric.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.6fr]">
            <Card className="rounded-lg border-iskool-cream bg-white py-0 shadow-[0_8px_28px_rgba(4,9,61,0.06)]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">User Overview</CardTitle>
                  <CardDescription>Current users and membership roles.</CardDescription>
                </div>
                <Badge variant="outline">Records</Badge>
              </CardHeader>
              <CardContent className="space-y-5 pb-6">
                <div className="flex items-center justify-center">
                  <div
                    className="grid size-52 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#2a4178 0 ${ringUserShare}%, #fff5d4 ${ringUserShare}% 100%)`,
                    }}
                  >
                    <div className="grid size-32 place-items-center rounded-full bg-white shadow-inner">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{totalOperationalRecords}</p>
                        <p className="text-xs text-muted-foreground">records</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-iskool-blue/10 px-3 py-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2 rounded-full bg-iskool-blue" />
                      Users
                    </span>
                    <span className="font-semibold">{data.users.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-iskool-cream px-3 py-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2 rounded-full bg-iskool-navy" />
                      Memberships
                    </span>
                    <span className="font-semibold">{data.memberships.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-iskool-cream bg-white py-0 shadow-[0_8px_28px_rgba(4,9,61,0.06)]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Users and Memberships</CardTitle>
                  <CardDescription>Existing admin records remain available.</CardDescription>
                </div>
                <UserCog className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="overflow-hidden pb-5">
                <div className="min-w-full overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground">
                      <tr>
                        <th className="py-3 font-medium">Record</th>
                        <th className="py-3 font-medium">Type</th>
                        <th className="py-3 font-medium">Visibility</th>
                        <th className="py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(recordRows.length ? recordRows : [{ type: "Record", item: "No user records visible yet." }]).map((row, index) => (
                        <tr key={`${row.type}-${row.item}-${index}`}>
                          <td className="max-w-[300px] py-3 pr-4">
                            <p className="truncate font-medium">{row.item}</p>
                          </td>
                          <td className="py-3 text-muted-foreground">{row.type}</td>
                          <td className="py-3">
                            <Badge variant="secondary">Current context</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="icon" aria-label={`Open ${row.item}`}>
                              <MoreVertical className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-lg border-iskool-cream bg-white py-0 shadow-[0_8px_28px_rgba(4,9,61,0.06)]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Classes and Enrollments</CardTitle>
                  <CardDescription>Operational records currently returned by the backend.</CardDescription>
                </div>
                <BookOpen className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                <AdminRecordGroup title="Classes" items={data.classes} icon={BookOpen} />
                <AdminRecordGroup title="Enrollments" items={data.enrollments} icon={ClipboardListIcon} />
              </CardContent>
            </Card>

            <Card className="rounded-lg border-iskool-cream bg-white py-0 shadow-[0_8px_28px_rgba(4,9,61,0.06)]">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Audit Trail</CardTitle>
                  <CardDescription>Administrative activity visible to this role.</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Audit trail
                  <Database className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {(data.audit.length ? data.audit : ["No audit records visible yet."]).map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-lg border border-iskool-cream bg-iskool-cream/30 p-3">
                    <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-iskool-cream text-iskool-navy">
                      <Database className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item}</p>
                      <p className="text-xs text-muted-foreground">Access controlled by admin membership roles.</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-lg border-iskool-cream bg-iskool-cream/35 py-0 shadow-none">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Backend guardrail</CardTitle>
                <CardDescription>
                  Admin is assigned through membership roles only. The client never writes admin status onto itself.
                </CardDescription>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/students">
                  Manage students
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

function ClipboardListIcon({ className }: { className?: string }) {
  return <NotebookTabs className={className} />
}

function AdminRecordGroup({
  title,
  items,
  icon: Icon,
}: {
  title: string
  items: string[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {(items.length ? items : ["No records visible yet."]).map((item, index) => (
        <div key={`${title}-${item}-${index}`} className="flex items-center gap-3 rounded-lg border border-iskool-cream p-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-iskool-cream/45 text-iskool-blue">
            <Icon className="size-4" />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{item}</p>
        </div>
      ))}
    </div>
  )
}
