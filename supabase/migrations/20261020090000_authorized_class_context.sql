-- Additive SAMS account associations and teaching authority. No APS table grants.
ALTER TABLE public.memberships ADD CONSTRAINT memberships_id_school_unique UNIQUE(id,school_id);
ALTER TABLE public.students ADD COLUMN membership_id uuid;
ALTER TABLE public.students ADD CONSTRAINT students_membership_school_unique UNIQUE(membership_id,school_id);
ALTER TABLE public.students ADD CONSTRAINT students_membership_school_fkey FOREIGN KEY(membership_id,school_id) REFERENCES public.memberships(id,school_id) ON DELETE RESTRICT;
GRANT UPDATE(membership_id) ON public.students TO iskool_sams_runtime;

CREATE TABLE public.class_teachers (
 class_id uuid NOT NULL, membership_id uuid NOT NULL, school_id uuid NOT NULL, academic_year_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(class_id,membership_id),
 FOREIGN KEY(class_id,school_id,academic_year_id) REFERENCES public.classes(id,school_id,academic_year_id) ON DELETE RESTRICT,
 FOREIGN KEY(membership_id,school_id) REFERENCES public.memberships(id,school_id) ON DELETE RESTRICT
);
CREATE INDEX class_teachers_membership_idx ON public.class_teachers(school_id,membership_id,status,class_id);
CREATE INDEX memberships_school_status_idx ON public.memberships(school_id,status,id);
CREATE INDEX classes_school_id_idx ON public.classes(school_id,id);

-- These private boolean policy helpers follow the existing master-data policy
-- pattern. Definer access is limited to ownership decisions to avoid recursive
-- student/enrollment/class RLS joins. They return no records, accept no actor ID,
-- check the active principal's school and are unavailable to PUBLIC/APS.
CREATE FUNCTION iskool.membership_has_school_role(target_membership uuid,target_school uuid,target_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_role IN ('student','teacher') AND target_school=iskool.current_school_id()
 AND iskool.principal_can_access_school(target_school)
 AND (target_membership=iskool.current_membership_id() OR iskool.can_manage_student_records(target_school))
 AND EXISTS(SELECT 1 FROM public.memberships m JOIN public.users u ON u.id=m.user_id AND u.status='active'
 JOIN public.membership_roles mr ON mr.membership_id=m.id JOIN public.roles r ON r.id=mr.role_id AND r.key=target_role
 WHERE m.id=target_membership AND m.school_id=target_school AND m.status='active');
$$;
CREATE FUNCTION iskool.can_read_school_class(target_class uuid,target_school uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_school=iskool.current_school_id() AND iskool.principal_can_access_school(target_school) AND (
 iskool.can_manage_student_records(target_school)
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'teacher') AND EXISTS(
 SELECT 1 FROM public.class_teachers t WHERE t.school_id=target_school AND t.class_id=target_class AND t.membership_id=iskool.current_membership_id() AND t.status='active'))
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'student') AND EXISTS(
 SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id=e.student_id AND s.school_id=e.school_id
 WHERE e.school_id=target_school AND e.class_id=target_class AND e.status='active' AND s.status='active' AND s.membership_id=iskool.current_membership_id())));
$$;
CREATE FUNCTION iskool.can_read_school_student(target_student uuid,target_school uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_school=iskool.current_school_id() AND iskool.principal_can_access_school(target_school) AND (
 iskool.can_manage_student_records(target_school)
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'student') AND EXISTS(
 SELECT 1 FROM public.students s WHERE s.id=target_student AND s.school_id=target_school AND s.membership_id=iskool.current_membership_id()))
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'teacher') AND EXISTS(
 SELECT 1 FROM public.enrollments e JOIN public.class_teachers t ON t.class_id=e.class_id AND t.school_id=e.school_id
 WHERE e.school_id=target_school AND e.student_id=target_student AND e.status='active' AND t.membership_id=iskool.current_membership_id() AND t.status='active')));
$$;
CREATE FUNCTION iskool.can_read_school_enrollment(target_student uuid,target_class uuid,target_school uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_school=iskool.current_school_id() AND iskool.principal_can_access_school(target_school) AND (
 iskool.can_manage_student_records(target_school)
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'student') AND EXISTS(
 SELECT 1 FROM public.students s WHERE s.id=target_student AND s.school_id=target_school AND s.membership_id=iskool.current_membership_id()))
 OR (iskool.membership_has_school_role(iskool.current_membership_id(),target_school,'teacher') AND EXISTS(
 SELECT 1 FROM public.class_teachers t WHERE t.school_id=target_school AND t.class_id=target_class AND t.membership_id=iskool.current_membership_id() AND t.status='active')));
$$;
REVOKE ALL ON FUNCTION iskool.membership_has_school_role(uuid,uuid,text),iskool.can_read_school_class(uuid,uuid),iskool.can_read_school_student(uuid,uuid),iskool.can_read_school_enrollment(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.membership_has_school_role(uuid,uuid,text),iskool.can_read_school_class(uuid,uuid),iskool.can_read_school_student(uuid,uuid),iskool.can_read_school_enrollment(uuid,uuid,uuid) TO iskool_sams_runtime;

CREATE FUNCTION iskool.validate_student_account() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.membership_id IS DISTINCT FROM OLD.membership_id THEN
  IF NEW.membership_id IS NOT NULL AND (NEW.status<>'active' OR NOT iskool.membership_has_school_role(NEW.membership_id,NEW.school_id,'student')) THEN
   RAISE EXCEPTION 'Choose an active Student account in this school' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Student version must advance' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE FUNCTION iskool.validate_class_teacher() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND (ROW(NEW.class_id,NEW.membership_id,NEW.school_id,NEW.academic_year_id) IS DISTINCT FROM ROW(OLD.class_id,OLD.membership_id,OLD.school_id,OLD.academic_year_id) OR NEW.version<>OLD.version+1 OR NEW.status=OLD.status) THEN
  RAISE EXCEPTION 'Teaching authority context is immutable; change status with its version' USING ERRCODE='23514';
 END IF;
 IF NEW.status='active' AND NOT iskool.membership_has_school_role(NEW.membership_id,NEW.school_id,'teacher') THEN RAISE EXCEPTION 'Choose an active Teacher account in this school' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_student_account(),iskool.validate_class_teacher() FROM PUBLIC;
CREATE TRIGGER students_validate_account BEFORE INSERT OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION iskool.validate_student_account();
CREATE TRIGGER class_teachers_validate BEFORE INSERT OR UPDATE ON public.class_teachers FOR EACH ROW EXECUTE FUNCTION iskool.validate_class_teacher();
CREATE TRIGGER class_teachers_touch_updated_at BEFORE UPDATE ON public.class_teachers FOR EACH ROW EXECUTE FUNCTION iskool.touch_updated_at();

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers FORCE ROW LEVEL SECURITY;
CREATE POLICY class_teachers_read ON public.class_teachers FOR SELECT TO iskool_sams_runtime USING(iskool.can_manage_student_records(school_id) OR (membership_id=iskool.current_membership_id() AND status='active' AND iskool.membership_has_school_role(membership_id,school_id,'teacher')));
CREATE POLICY class_teachers_insert ON public.class_teachers FOR INSERT TO iskool_sams_runtime WITH CHECK(iskool.can_manage_student_records(school_id));
CREATE POLICY class_teachers_update ON public.class_teachers FOR UPDATE TO iskool_sams_runtime USING(iskool.can_manage_student_records(school_id)) WITH CHECK(iskool.can_manage_student_records(school_id));
GRANT SELECT,INSERT ON public.class_teachers TO iskool_sams_runtime;
GRANT UPDATE(status,version,updated_at) ON public.class_teachers TO iskool_sams_runtime;
CREATE POLICY students_authorized_context_read ON public.students FOR SELECT TO iskool_sams_runtime USING(iskool.can_read_school_student(id,school_id));
CREATE POLICY classes_authorized_context_read ON public.classes FOR SELECT TO iskool_sams_runtime USING(iskool.can_read_school_class(id,school_id));
CREATE POLICY enrollments_authorized_context_read ON public.enrollments FOR SELECT TO iskool_sams_runtime USING(iskool.can_read_school_enrollment(student_id,class_id,school_id));
CREATE POLICY academic_years_member_read ON public.academic_years FOR SELECT TO iskool_sams_runtime USING(iskool.principal_can_access_school(school_id));
CREATE POLICY academic_terms_member_read ON public.academic_terms FOR SELECT TO iskool_sams_runtime USING(iskool.principal_can_access_school(school_id));
