-- VIM-51 first student/guardian/enrollment slice. SAMS owns calendar and class master data.
-- Additive only: no existing records or policies are removed.
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  admission_number text NOT NULL CHECK (length(btrim(admission_number)) BETWEEN 1 AND 64 AND admission_number=upper(btrim(admission_number))),
  given_name text NOT NULL CHECK (length(btrim(given_name)) BETWEEN 1 AND 100),
  family_name text NOT NULL CHECK (length(btrim(family_name)) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,school_id), UNIQUE (school_id,admission_number)
);
CREATE INDEX students_school_id_idx ON public.students(school_id,id);
CREATE INDEX students_school_name_idx ON public.students(school_id,family_name,given_name,id);
CREATE TABLE public.guardians (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  phone text CHECK (length(phone) <= 40),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,school_id), UNIQUE (school_id,email)
);
CREATE TABLE public.student_guardians (
  student_id uuid NOT NULL, guardian_id uuid NOT NULL, school_id uuid NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent','guardian','other')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,guardian_id),
  FOREIGN KEY (student_id,school_id) REFERENCES public.students(id,school_id) ON DELETE RESTRICT,
  FOREIGN KEY (guardian_id,school_id) REFERENCES public.guardians(id,school_id) ON DELETE RESTRICT
);
CREATE INDEX student_guardians_guardian_idx ON public.student_guardians(school_id,guardian_id);
CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  starts_on date NOT NULL, ends_on date NOT NULL CHECK (ends_on >= starts_on),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,school_id), UNIQUE (school_id,label)
);
CREATE TABLE public.academic_terms (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(), school_id uuid NOT NULL, academic_year_id uuid NOT NULL,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  starts_on date NOT NULL, ends_on date NOT NULL CHECK (ends_on >= starts_on),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (academic_year_id,school_id) REFERENCES public.academic_years(id,school_id) ON DELETE RESTRICT,
  UNIQUE (id,school_id,academic_year_id), UNIQUE (school_id,academic_year_id,label)
);
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(), school_id uuid NOT NULL, academic_year_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (academic_year_id,school_id) REFERENCES public.academic_years(id,school_id) ON DELETE RESTRICT,
  UNIQUE (id,school_id,academic_year_id), UNIQUE (school_id,academic_year_id,name)
);
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  school_id uuid NOT NULL, student_id uuid NOT NULL, class_id uuid NOT NULL,
  academic_year_id uuid NOT NULL, academic_term_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','withdrawn','transferred','completed','cancelled')),
  enrolled_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id,school_id) REFERENCES public.students(id,school_id) ON DELETE RESTRICT,
  FOREIGN KEY (class_id,school_id,academic_year_id) REFERENCES public.classes(id,school_id,academic_year_id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_term_id,school_id,academic_year_id) REFERENCES public.academic_terms(id,school_id,academic_year_id) ON DELETE RESTRICT,
  CHECK ((status IN ('pending','active') AND ended_at IS NULL) OR (status IN ('withdrawn','transferred','completed','cancelled') AND ended_at IS NOT NULL AND ended_at >= enrolled_at))
);
CREATE UNIQUE INDEX enrollments_open_unique ON public.enrollments(school_id,student_id,class_id,academic_term_id) WHERE status IN ('pending','active');
CREATE INDEX enrollments_student_history_idx ON public.enrollments(school_id,student_id,enrolled_at DESC,id);
CREATE INDEX enrollments_class_status_idx ON public.enrollments(school_id,class_id,academic_term_id,status);

CREATE FUNCTION iskool.can_manage_student_records(target_school_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.users u ON u.id=m.user_id AND u.status='active'
    JOIN public.schools s ON s.id=m.school_id AND s.status='active'
    JOIN public.membership_roles mr ON mr.membership_id=m.id
    JOIN public.roles r ON r.id=mr.role_id AND r.key IN ('admin','registrar')
    WHERE m.id=iskool.current_membership_id() AND m.user_id=iskool.current_user_id()
      AND m.school_id=iskool.current_school_id() AND m.school_id=target_school_id AND m.status='active'
  );
$$;
REVOKE ALL ON FUNCTION iskool.can_manage_student_records(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.can_manage_student_records(uuid) TO iskool_sams_runtime;

CREATE FUNCTION iskool.validate_academic_term() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.academic_years y WHERE y.id=NEW.academic_year_id AND y.school_id=NEW.school_id AND NEW.starts_on>=y.starts_on AND NEW.ends_on<=y.ends_on) THEN
    RAISE EXCEPTION 'Term dates must be within its school academic year' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_academic_term() FROM PUBLIC;
CREATE TRIGGER academic_terms_validate BEFORE INSERT OR UPDATE ON public.academic_terms FOR EACH ROW EXECUTE FUNCTION iskool.validate_academic_term();

CREATE FUNCTION iskool.validate_enrollment_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(NEW.school_id,NEW.student_id,NEW.class_id,NEW.academic_year_id,NEW.academic_term_id,NEW.enrolled_at) IS DISTINCT FROM ROW(OLD.school_id,OLD.student_id,OLD.class_id,OLD.academic_year_id,OLD.academic_term_id,OLD.enrolled_at) THEN
    RAISE EXCEPTION 'Enrollment context is immutable; retain history and create a new enrollment' USING ERRCODE='23514';
  END IF;
  IF NOT ((OLD.status='pending' AND NEW.status IN ('active','cancelled')) OR (OLD.status='active' AND NEW.status IN ('withdrawn','transferred','completed'))) OR NEW.version<>OLD.version+1 THEN
    RAISE EXCEPTION 'Enrollment status cannot change through this transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_enrollment_transition() FROM PUBLIC;
CREATE TRIGGER enrollments_validate BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION iskool.validate_enrollment_transition();

-- Privileged master-data access only; no APS grants and no destructive DELETE privilege.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['students','guardians','student_guardians','academic_years','academic_terms','classes','enrollments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY sams_master_read ON public.%I FOR SELECT TO iskool_sams_runtime USING (iskool.can_manage_student_records(school_id))',table_name);
    EXECUTE format('CREATE POLICY sams_master_insert ON public.%I FOR INSERT TO iskool_sams_runtime WITH CHECK (iskool.can_manage_student_records(school_id))',table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION iskool.touch_updated_at()',table_name||'_touch_updated_at',table_name);
    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO iskool_sams_runtime',table_name);
  END LOOP;
END; $$;
CREATE POLICY sams_student_update ON public.students FOR UPDATE TO iskool_sams_runtime USING (iskool.can_manage_student_records(school_id)) WITH CHECK (iskool.can_manage_student_records(school_id));
CREATE POLICY sams_enrollment_update ON public.enrollments FOR UPDATE TO iskool_sams_runtime USING (iskool.can_manage_student_records(school_id)) WITH CHECK (iskool.can_manage_student_records(school_id));
GRANT UPDATE (given_name,family_name,status,version,updated_at) ON public.students TO iskool_sams_runtime;
GRANT UPDATE (status,ended_at,version,updated_at) ON public.enrollments TO iskool_sams_runtime;
-- Serialize archival against enrollment creation even for direct restricted-role SQL.
CREATE FUNCTION iskool.validate_student_archival() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.status='archived' AND EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id=OLD.id AND e.school_id=OLD.school_id AND e.status IN ('pending','active')) THEN
    RAISE EXCEPTION 'Close open enrollments before archiving a student' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_student_archival() FROM PUBLIC;
CREATE TRIGGER students_validate_archival BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION iskool.validate_student_archival();
CREATE FUNCTION iskool.validate_student_enrollment() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE student_status text;
BEGIN
  SELECT status INTO student_status FROM public.students WHERE id=NEW.student_id AND school_id=NEW.school_id FOR UPDATE;
  IF student_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Enrollment requires an active student in the same school' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_student_enrollment() FROM PUBLIC;
CREATE TRIGGER enrollments_validate_student BEFORE INSERT ON public.enrollments FOR EACH ROW EXECUTE FUNCTION iskool.validate_student_enrollment();
