CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Runtime privilege roles are versioned, but password-bearing LOGIN roles are
-- provisioned by each environment and never committed in migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iskool_aps_runtime') THEN
    CREATE ROLE iskool_aps_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iskool_sams_runtime') THEN
    CREATE ROLE iskool_sams_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS iskool;

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schools_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_user_school_unique UNIQUE (user_id, school_id),
  CONSTRAINT memberships_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_key_unique UNIQUE (key)
);

CREATE TABLE public.membership_roles (
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role_id)
);

CREATE INDEX memberships_user_id_idx ON public.memberships(user_id);
CREATE INDEX memberships_school_id_idx ON public.memberships(school_id);
CREATE INDEX memberships_user_school_idx ON public.memberships(user_id, school_id);
CREATE INDEX membership_roles_membership_id_idx ON public.membership_roles(membership_id);
CREATE INDEX membership_roles_role_id_idx ON public.membership_roles(role_id);

INSERT INTO public.roles (key, name, description)
VALUES
  ('student', 'Student', 'Learner membership within a school'),
  ('teacher', 'Teacher', 'Teaching staff membership within a school'),
  ('registrar', 'Registrar', 'Administrative registration membership within a school'),
  ('finance', 'Finance', 'Finance office membership within a school'),
  ('hr', 'HR', 'Human resources membership within a school'),
  ('admin', 'Admin', 'School administration membership'),
  ('leadership', 'Leadership', 'School leadership membership')
ON CONFLICT (key) DO NOTHING;

-- Platform tables use one database-managed updated_at convention.
CREATE OR REPLACE FUNCTION iskool.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER schools_touch_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER memberships_touch_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER roles_touch_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER membership_roles_touch_updated_at
BEFORE UPDATE ON public.membership_roles
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

-- RLS reads transaction-local settings set by NestJS/Prisma transactions.
-- Malformed or missing context resolves to NULL so policies fail closed.
CREATE OR REPLACE FUNCTION iskool.setting_uuid(setting_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN current_setting(setting_name, true) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN current_setting(setting_name, true)::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION iskool.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT iskool.setting_uuid('iskool.user_id');
$$;

CREATE OR REPLACE FUNCTION iskool.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT iskool.setting_uuid('iskool.school_id');
$$;

CREATE OR REPLACE FUNCTION iskool.current_membership_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT iskool.setting_uuid('iskool.membership_id');
$$;

CREATE OR REPLACE FUNCTION iskool.principal_can_access_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships principal_membership
    WHERE principal_membership.id = iskool.current_membership_id()
      AND principal_membership.user_id = iskool.current_user_id()
      AND principal_membership.school_id = iskool.current_school_id()
      AND principal_membership.school_id = target_school_id
      AND principal_membership.status = 'active'
  );
$$;

-- SECURITY DEFINER avoids recursive RLS while keeping the lookup narrow and
-- search_path locked. Runtime roles receive EXECUTE only on these helpers.
CREATE OR REPLACE FUNCTION iskool.principal_can_access_membership(target_membership_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships target_membership
    WHERE target_membership.id = target_membership_id
      AND iskool.principal_can_access_school(target_membership.school_id)
  );
$$;

CREATE OR REPLACE FUNCTION iskool.principal_can_access_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_user_id = iskool.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM public.memberships target_membership
      WHERE target_membership.user_id = target_user_id
        AND iskool.principal_can_access_school(target_membership.school_id)
    );
$$;

REVOKE ALL ON SCHEMA iskool FROM PUBLIC;
GRANT USAGE ON SCHEMA iskool TO iskool_aps_runtime, iskool_sams_runtime;

REVOKE ALL ON FUNCTION iskool.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.current_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.current_membership_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.setting_uuid(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.principal_can_access_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.principal_can_access_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.principal_can_access_user(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION iskool.current_user_id() TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.current_school_id() TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.current_membership_id() TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.setting_uuid(text) TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.principal_can_access_school(uuid) TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.principal_can_access_membership(uuid) TO iskool_aps_runtime, iskool_sams_runtime;
GRANT EXECUTE ON FUNCTION iskool.principal_can_access_user(uuid) TO iskool_aps_runtime, iskool_sams_runtime;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_roles FORCE ROW LEVEL SECURITY;

CREATE POLICY schools_runtime_tenant_isolation
ON public.schools
FOR SELECT
TO iskool_aps_runtime, iskool_sams_runtime
USING (iskool.principal_can_access_school(id));

CREATE POLICY users_runtime_self_or_school_peer
ON public.users
FOR SELECT
TO iskool_aps_runtime, iskool_sams_runtime
USING (
  iskool.principal_can_access_user(id)
);

CREATE POLICY memberships_runtime_tenant_isolation
ON public.memberships
FOR SELECT
TO iskool_aps_runtime, iskool_sams_runtime
USING (iskool.principal_can_access_school(school_id));

CREATE POLICY membership_roles_runtime_tenant_isolation
ON public.membership_roles
FOR SELECT
TO iskool_aps_runtime, iskool_sams_runtime
USING (
  membership_id = iskool.current_membership_id()
  AND iskool.principal_can_access_membership(membership_id)
);

GRANT USAGE ON SCHEMA public TO iskool_aps_runtime, iskool_sams_runtime;
GRANT SELECT ON public.roles TO iskool_aps_runtime, iskool_sams_runtime;
GRANT SELECT ON public.schools TO iskool_aps_runtime, iskool_sams_runtime;
GRANT SELECT ON public.users TO iskool_aps_runtime, iskool_sams_runtime;
GRANT SELECT ON public.memberships TO iskool_aps_runtime, iskool_sams_runtime;
GRANT SELECT ON public.membership_roles TO iskool_aps_runtime, iskool_sams_runtime;
