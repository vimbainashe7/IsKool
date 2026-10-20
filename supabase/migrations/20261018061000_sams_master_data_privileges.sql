-- Forward-only privilege hardening: hosted Supabase may have provider default grants.
-- RLS alone does not protect TRUNCATE. Only the SAMS permissions below survive.
DO $$ DECLARE table_name text; provider_role text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['students','guardians','student_guardians','academic_years','academic_terms','classes','enrollments'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, iskool_aps_runtime, iskool_auth_runtime, iskool_sams_runtime',table_name);
    FOREACH provider_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=provider_role) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I',table_name,provider_role);
      END IF;
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO iskool_sams_runtime',table_name);
  END LOOP;
END; $$;
GRANT UPDATE (given_name,family_name,status,version,updated_at) ON public.students TO iskool_sams_runtime;
GRANT UPDATE (status,ended_at,version,updated_at) ON public.enrollments TO iskool_sams_runtime;
