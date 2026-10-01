-- IsKool automation core blueprint.
-- Apply after the auth/RLS foundation migration.
-- Scope: attendance logs, AI-generated learning modules, reminders, timetable slots,
-- and school branding fields used by the frontend tenant branding layer.

alter table public.schools
  add column if not exists logo_url text,
  add column if not exists brand_color text;

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_membership_id uuid not null references public.school_memberships(id) on delete cascade,
  marked_by_membership_id uuid references public.school_memberships(id),
  attendance_date date not null,
  period_label text,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  source text not null default 'manual' check (source in ('manual', 'smart-suggested', 'imported')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_membership_id, attendance_date, period_label)
);

create table if not exists public.ai_module_drafts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  teacher_membership_id uuid not null references public.school_memberships(id) on delete cascade,
  ai_job_id uuid references public.ai_jobs(id) on delete set null,
  title text not null,
  source_text_hash text not null,
  key_takeaways jsonb not null default '[]'::jsonb,
  flashcards jsonb not null default '[]'::jsonb,
  revision_quiz jsonb not null default '[]'::jsonb,
  teacher_notes text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  recipient_membership_id uuid references public.school_memberships(id) on delete cascade,
  audience text not null default 'membership' check (audience in ('membership', 'class', 'school')),
  class_id uuid references public.classes(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'assignment_due',
      'missing_submission',
      'attendance_exception',
      'grade_published',
      'module_published',
      'admin_exception'
    )
  ),
  title text not null,
  body text not null,
  deep_link text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_membership_id uuid references public.school_memberships(id) on delete set null,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text,
  source text not null default 'manual' check (source in ('manual', 'generated')),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index if not exists attendance_logs_school_date_idx
  on public.attendance_logs (school_id, attendance_date desc);
create index if not exists attendance_logs_class_date_idx
  on public.attendance_logs (class_id, attendance_date desc);
create index if not exists ai_module_drafts_school_status_idx
  on public.ai_module_drafts (school_id, status, created_at desc);
create index if not exists notification_events_due_idx
  on public.notification_events (school_id, scheduled_for)
  where sent_at is null;
create index if not exists timetable_slots_class_weekday_idx
  on public.timetable_slots (class_id, weekday, starts_at);

alter table public.attendance_logs enable row level security;
alter table public.ai_module_drafts enable row level security;
alter table public.notification_events enable row level security;
alter table public.timetable_slots enable row level security;

create policy "class participants can view attendance"
on public.attendance_logs for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
  or exists (
    select 1
    from public.school_memberships sm
    where sm.id = student_membership_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
  )
);

create policy "teachers mark attendance"
on public.attendance_logs for insert
to authenticated
with check (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
);

create policy "teachers correct attendance"
on public.attendance_logs for update
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
)
with check (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
);

create policy "teachers manage module drafts"
on public.ai_module_drafts for all
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.has_school_role(school_id, 'teacher')
)
with check (
  private.has_school_role(school_id, 'admin')
  or private.has_school_role(school_id, 'teacher')
);

create policy "students view published modules for enrolled classes"
on public.ai_module_drafts for select
to authenticated
using (
  status = 'published'
  and published_at is not null
  and class_id is not null
  and private.is_student_in_class(class_id)
);

create policy "members view scoped notification events"
on public.notification_events for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or exists (
    select 1
    from public.school_memberships sm
    where sm.id = recipient_membership_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
  )
  or (class_id is not null and private.is_teacher_of_class(class_id))
  or (class_id is not null and private.is_student_in_class(class_id))
);

create policy "staff create notification events"
on public.notification_events for insert
to authenticated
with check (
  private.has_school_role(school_id, 'admin')
  or private.has_school_role(school_id, 'teacher')
);

create policy "members view timetable"
on public.timetable_slots for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
  or private.is_student_in_class(class_id)
);

create policy "admins manage timetable"
on public.timetable_slots for all
to authenticated
using (private.has_school_role(school_id, 'admin'))
with check (private.has_school_role(school_id, 'admin'));
