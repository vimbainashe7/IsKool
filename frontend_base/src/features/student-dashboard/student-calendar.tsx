"use client"
import { useState, type ComponentProps } from "react"
import Link from "next/link"
import { CalendarDays, ChevronRight } from "lucide-react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/features/workspace/workspace-provider"
import {
  calendarDate,
  calendarDayKey,
  schoolDayKey,
  type StudentDashboardModel,
} from "./model"
import styles from "./student-dashboard.module.css"
function StudentCalendarDayButton(
  props: ComponentProps<typeof CalendarDayButton>
) {
  return (
    <CalendarDayButton {...props} data-day={calendarDayKey(props.day.date)} />
  )
}
export function StudentCalendarCard({
  model,
}: {
  model: StudentDashboardModel
}) {
  const { data: w, refresh } = useWorkspace()
  const [selected, setSelected] = useState(model.today)
  const [retrying, setRetrying] = useState(false)
  const [notice, setNotice] = useState("")
  const deadlines = model.assignments.filter((a) => a.dueAt)
  const selectedKey = calendarDayKey(selected)
  const events = deadlines.filter((a) => schoolDayKey(a.dueAt!) === selectedKey)
  async function retry() {
    setRetrying(true)
    try {
      await refresh()
      setNotice("Schedule refreshed.")
    } catch {
      setNotice("Your schedule could not be refreshed. Try again shortly.")
    } finally {
      setRetrying(false)
    }
  }
  return (
    <section
      className={styles.calendarArea}
      aria-labelledby="student-calendar-title"
    >
      <Card className={styles.calendarCard}>
        <div className={styles.calendarHeading}>
          <CalendarDays size={17} aria-hidden="true" />
          <h2 id="student-calendar-title">Your calendar</h2>
        </div>
        <Calendar
          mode="single"
          required
          selected={selected}
          onSelect={(date) => {
            if (date) setSelected(date)
          }}
          defaultMonth={model.today}
          today={model.today}
          classNames={{ today: styles.calendarToday }}
          components={{ DayButton: StudentCalendarDayButton }}
          weekStartsOn={1}
          className={styles.calendar}
          modifiers={{
            deadline: deadlines.map((a) =>
              calendarDate(schoolDayKey(a.dueAt!))
            ),
          }}
          modifiersClassNames={{ deadline: styles.deadline }}
        />
        <p className={styles.calendarLegend}>
          <span aria-hidden="true" />
          Assignment deadlines
        </p>
        <div className={styles.daySummary} aria-live="polite">
          <h3>
            {selected.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </h3>
          {events.length ? (
            <ul>
              {events.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link href={`/student/assignments/${a.id}`}>
                    <span>
                      {a.title}
                      {model.submittedIds.has(a.id) ? (
                        <small>Submitted</small>
                      ) : null}
                    </span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No assignment deadlines.</p>
          )}
        </div>
        {w.warnings.some((message) => /timetable/i.test(message)) ? (
          <div className={styles.calendarWarning}>
            <p>Schedule unavailable. Known assignment deadlines are shown.</p>
            <Button
              variant="ghost"
              size="sm"
              disabled={retrying}
              onClick={retry}
            >
              {retrying ? "Refreshing…" : "Retry schedule"}
            </Button>
          </div>
        ) : null}
        {notice ? (
          <p role="status" className={styles.meta}>
            {notice}
          </p>
        ) : null}
      </Card>
    </section>
  )
}
