create schema if not exists private;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (school_id, profile_id)
);

create table if not exists public.membership_roles (
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  role_key text not null check (role_key in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  primary key (membership_id, role_key)
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  subject text,
  year_level text,
  created_at timestamptz not null default now()
);

create table if not exists public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, membership_id)
);

create table if not exists public.class_enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, membership_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by_membership_id uuid not null references public.school_memberships(id),
  title text not null,
  instructions text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_membership_id uuid not null references public.school_memberships(id) on delete cascade,
  storage_bucket text not null default 'assignment-submissions',
  storage_path text not null,
  original_filename text not null,
  status text not null default 'submitted' check (status in ('submitted', 'returned', 'graded')),
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_membership_id)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  uploaded_by_membership_id uuid not null references public.school_memberships(id),
  title text not null,
  storage_bucket text not null default 'teacher-materials',
  storage_path text not null,
  original_filename text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  student_membership_id uuid not null references public.school_memberships(id) on delete cascade,
  graded_by_membership_id uuid not null references public.school_memberships(id),
  score numeric,
  feedback text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  requested_by_membership_id uuid not null references public.school_memberships(id),
  tool_key text not null check (tool_key in ('compile-notes', 'create-test', 'create-assignment')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  prompt text not null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ai_job_id uuid not null references public.ai_jobs(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'rejected')),
  reviewed_by_membership_id uuid references public.school_memberships(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  school_id uuid references public.schools(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists school_memberships_profile_idx on public.school_memberships(profile_id);
create index if not exists membership_roles_role_idx on public.membership_roles(role_key);
create index if not exists classes_school_idx on public.classes(school_id);
create index if not exists assignments_class_idx on public.assignments(class_id);
create index if not exists submissions_assignment_idx on public.submissions(assignment_id);
create index if not exists grades_student_idx on public.grades(student_membership_id);
create index if not exists audit_logs_school_created_idx on public.audit_logs(school_id, created_at desc);

create or replace function private.is_school_member(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = target_school_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

create or replace function private.has_school_role(target_school_id uuid, target_role text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.school_memberships sm
    join public.membership_roles mr on mr.membership_id = sm.id
    where sm.school_id = target_school_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
      and mr.role_key = target_role
  );
$$;

create or replace function private.is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.class_teachers ct
    join public.school_memberships sm on sm.id = ct.membership_id
    join public.membership_roles mr on mr.membership_id = sm.id and mr.role_key = 'teacher'
    where ct.class_id = target_class_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

create or replace function private.is_student_in_class(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.class_enrollments ce
    join public.school_memberships sm on sm.id = ce.membership_id
    join public.membership_roles mr on mr.membership_id = sm.id and mr.role_key = 'student'
    where ce.class_id = target_class_id
      and sm.profile_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

revoke all on schema private from public;
revoke execute on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.membership_roles enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.materials enable row level security;
alter table public.grades enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.generated_content enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can view their schools"
on public.schools for select
to authenticated
using (private.is_school_member(id));

create policy "users can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "members can view school memberships"
on public.school_memberships for select
to authenticated
using (private.is_school_member(school_id));

create policy "admins can manage memberships"
on public.school_memberships for all
to authenticated
using (private.has_school_role(school_id, 'admin'))
with check (private.has_school_role(school_id, 'admin'));

create policy "members can view role rows"
on public.membership_roles for select
to authenticated
using (
  exists (
    select 1
    from public.school_memberships sm
    where sm.id = membership_id
      and private.is_school_member(sm.school_id)
  )
);

create policy "admins can manage role rows"
on public.membership_roles for all
to authenticated
using (
  exists (
    select 1
    from public.school_memberships sm
    where sm.id = membership_id
      and private.has_school_role(sm.school_id, 'admin')
  )
)
with check (
  exists (
    select 1
    from public.school_memberships sm
    where sm.id = membership_id
      and private.has_school_role(sm.school_id, 'admin')
  )
);

create policy "members can view classes"
on public.classes for select
to authenticated
using (private.is_school_member(school_id));

create policy "admins can manage classes"
on public.classes for all
to authenticated
using (private.has_school_role(school_id, 'admin'))
with check (private.has_school_role(school_id, 'admin'));

create policy "members can view class teachers"
on public.class_teachers for select
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.is_school_member(c.school_id)
  )
);

create policy "admins can manage class teachers"
on public.class_teachers for all
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.has_school_role(c.school_id, 'admin')
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.has_school_role(c.school_id, 'admin')
  )
);

create policy "class participants can view enrollments"
on public.class_enrollments for select
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.is_school_member(c.school_id)
      and (
        private.has_school_role(c.school_id, 'admin')
        or private.is_teacher_of_class(class_id)
        or private.is_student_in_class(class_id)
      )
  )
);

create policy "admins can manage enrollments"
on public.class_enrollments for all
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.has_school_role(c.school_id, 'admin')
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and private.has_school_role(c.school_id, 'admin')
  )
);

create policy "class participants can view assignments"
on public.assignments for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
  or (status = 'published' and private.is_student_in_class(class_id))
);

create policy "teachers can manage assignments"
on public.assignments for all
to authenticated
using (private.has_school_role(school_id, 'admin') or private.is_teacher_of_class(class_id))
with check (private.has_school_role(school_id, 'admin') or private.is_teacher_of_class(class_id));

create policy "students and teachers can view submissions"
on public.submissions for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and private.is_teacher_of_class(a.class_id)
  )
  or exists (
    select 1 from public.school_memberships sm
    where sm.id = student_membership_id and sm.profile_id = (select auth.uid())
  )
);

create policy "students can create own submissions"
on public.submissions for insert
to authenticated
with check (
  exists (
    select 1 from public.school_memberships sm
    join public.assignments a on a.id = assignment_id
    where sm.id = student_membership_id
      and sm.profile_id = (select auth.uid())
      and sm.school_id = school_id
      and private.is_student_in_class(a.class_id)
  )
);

create policy "class participants can view materials"
on public.materials for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or private.is_teacher_of_class(class_id)
  or (published_at is not null and private.is_student_in_class(class_id))
);

create policy "teachers can manage materials"
on public.materials for all
to authenticated
using (private.has_school_role(school_id, 'admin') or private.is_teacher_of_class(class_id))
with check (private.has_school_role(school_id, 'admin') or private.is_teacher_of_class(class_id));

create policy "students can view own published grades"
on public.grades for select
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_id and private.is_teacher_of_class(a.class_id)
  )
  or (
    published_at is not null
    and exists (
      select 1 from public.school_memberships sm
      where sm.id = student_membership_id and sm.profile_id = (select auth.uid())
    )
  )
);

create policy "teachers can manage grades"
on public.grades for all
to authenticated
using (
  private.has_school_role(school_id, 'admin')
  or exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_id and private.is_teacher_of_class(a.class_id)
  )
)
with check (
  private.has_school_role(school_id, 'admin')
  or exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = submission_id and private.is_teacher_of_class(a.class_id)
  )
);

create policy "teachers can manage own ai jobs"
on public.ai_jobs for all
to authenticated
using (private.has_school_role(school_id, 'admin') or private.has_school_role(school_id, 'teacher'))
with check (private.has_school_role(school_id, 'admin') or private.has_school_role(school_id, 'teacher'));

create policy "teachers can manage generated drafts"
on public.generated_content for all
to authenticated
using (private.has_school_role(school_id, 'admin') or private.has_school_role(school_id, 'teacher'))
with check (private.has_school_role(school_id, 'admin') or private.has_school_role(school_id, 'teacher'));

create policy "members can view audit logs"
on public.audit_logs for select
to authenticated
using (private.has_school_role(school_id, 'admin'));

create policy "members can insert audit logs"
on public.audit_logs for insert
to authenticated
with check (private.is_school_member(school_id));

insert into storage.buckets (id, name, public)
values
  ('assignment-submissions', 'assignment-submissions', false),
  ('teacher-materials', 'teacher-materials', false)
on conflict (id) do update set public = excluded.public;

create policy "students upload assignment submissions"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = 'schools'
  and private.is_school_member(((storage.foldername(name))[2])::uuid)
);

create policy "submission participants read assignment files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = 'schools'
  and private.is_school_member(((storage.foldername(name))[2])::uuid)
);

create policy "teachers upload class materials"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'teacher-materials'
  and (storage.foldername(name))[1] = 'schools'
  and private.has_school_role(((storage.foldername(name))[2])::uuid, 'teacher')
);

create policy "class members read teacher materials"
on storage.objects for select
to authenticated
using (
  bucket_id = 'teacher-materials'
  and (storage.foldername(name))[1] = 'schools'
  and private.is_school_member(((storage.foldername(name))[2])::uuid)
);
