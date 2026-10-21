-- APS owns assignments. Application master-data reads still use SAMS's API.
-- This private, principal-bound boolean is exclusively an RLS integrity check;
-- it grants APS no direct SELECT privilege on SAMS tables and returns no records.
CREATE FUNCTION iskool.assignment_context_allowed(target_class uuid,target_school uuid,target_year uuid,target_term uuid,target_due timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_school=iskool.current_school_id() AND iskool.principal_can_access_school(target_school)
 AND EXISTS(SELECT 1 FROM public.membership_roles mr JOIN public.roles r ON r.id=mr.role_id
 WHERE mr.membership_id=iskool.current_membership_id() AND r.key='teacher')
 AND EXISTS(SELECT 1 FROM public.class_teachers ct JOIN public.classes c ON c.id=ct.class_id AND c.school_id=ct.school_id AND c.academic_year_id=ct.academic_year_id
 JOIN public.academic_terms t ON t.id=target_term AND t.school_id=c.school_id AND t.academic_year_id=c.academic_year_id
 WHERE ct.class_id=target_class AND ct.school_id=target_school AND ct.academic_year_id=target_year
 AND ct.membership_id=iskool.current_membership_id() AND ct.status='active'
 AND (target_due AT TIME ZONE 'Africa/Harare')::date BETWEEN t.starts_on AND t.ends_on);
$$;
REVOKE ALL ON FUNCTION iskool.assignment_context_allowed(uuid,uuid,uuid,uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.assignment_context_allowed(uuid,uuid,uuid,uuid,timestamptz) TO iskool_aps_runtime;

CREATE TABLE public.assignments (
 id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
 school_id uuid NOT NULL, class_id uuid NOT NULL, academic_year_id uuid NOT NULL, academic_term_id uuid NOT NULL, author_membership_id uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160),
 instructions text NOT NULL CHECK(length(btrim(instructions)) BETWEEN 1 AND 10000),
 total_marks numeric(6,2) NOT NULL CHECK(total_marks>0 AND total_marks<=1000),
 due_at timestamptz NOT NULL CHECK(isfinite(due_at)),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(class_id,school_id,academic_year_id) REFERENCES public.classes(id,school_id,academic_year_id) ON DELETE RESTRICT,
 FOREIGN KEY(academic_term_id,school_id,academic_year_id) REFERENCES public.academic_terms(id,school_id,academic_year_id) ON DELETE RESTRICT,
 FOREIGN KEY(author_membership_id,school_id) REFERENCES public.memberships(id,school_id) ON DELETE RESTRICT,
 CHECK((status='draft' AND published_at IS NULL) OR status='archived' OR (status='published' AND published_at IS NOT NULL))
);
CREATE INDEX assignments_teacher_page_idx ON public.assignments(school_id,author_membership_id,id);
CREATE INDEX assignments_teacher_status_idx ON public.assignments(school_id,author_membership_id,status);
CREATE INDEX assignments_class_feed_idx ON public.assignments(school_id,class_id,academic_term_id,status,due_at,id);

CREATE FUNCTION iskool.validate_assignment_transition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.created_at=statement_timestamp(); NEW.updated_at=NEW.created_at;
  IF NEW.status<>'draft' OR NEW.version<>1 OR NEW.published_at IS NOT NULL THEN RAISE EXCEPTION 'Create a draft first' USING ERRCODE='23514'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.school_id,NEW.class_id,NEW.academic_year_id,NEW.academic_term_id,NEW.author_membership_id,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.school_id,OLD.class_id,OLD.academic_year_id,OLD.academic_term_id,OLD.author_membership_id,OLD.created_at)
    OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Immutable assignment context or invalid version' USING ERRCODE='23514'; END IF;
  IF OLD.status='archived' OR (OLD.status='published' AND (NEW.status<>'archived' OR ROW(NEW.title,NEW.instructions,NEW.total_marks,NEW.due_at) IS DISTINCT FROM ROW(OLD.title,OLD.instructions,OLD.total_marks,OLD.due_at)))
    OR (OLD.status='draft' AND NEW.status NOT IN ('draft','published','archived')) THEN RAISE EXCEPTION 'Invalid assignment transition' USING ERRCODE='23514'; END IF;
  NEW.published_at=OLD.published_at;
  IF NEW.status='published' AND OLD.status='draft' THEN
   IF NEW.due_at<=clock_timestamp() THEN RAISE EXCEPTION 'Publication requires a future deadline' USING ERRCODE='23514'; END IF;
   NEW.published_at=clock_timestamp();
  END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_assignment_transition() FROM PUBLIC;
CREATE TRIGGER assignments_validate BEFORE INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION iskool.validate_assignment_transition();
CREATE TRIGGER assignments_touch BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION iskool.touch_updated_at();
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.assignments FROM PUBLIC,anon,authenticated,service_role,iskool_sams_runtime,iskool_aps_runtime;
GRANT SELECT,INSERT ON public.assignments TO iskool_aps_runtime;
GRANT UPDATE(title,instructions,total_marks,due_at,status,version,updated_at) ON public.assignments TO iskool_aps_runtime;
CREATE POLICY assignments_teacher_read ON public.assignments FOR SELECT TO iskool_aps_runtime
 USING(author_membership_id=iskool.current_membership_id() AND iskool.assignment_context_allowed(class_id,school_id,academic_year_id,academic_term_id,due_at));
CREATE POLICY assignments_teacher_insert ON public.assignments FOR INSERT TO iskool_aps_runtime
 WITH CHECK(author_membership_id=iskool.current_membership_id() AND iskool.assignment_context_allowed(class_id,school_id,academic_year_id,academic_term_id,due_at));
CREATE POLICY assignments_teacher_update ON public.assignments FOR UPDATE TO iskool_aps_runtime
 USING(author_membership_id=iskool.current_membership_id() AND iskool.assignment_context_allowed(class_id,school_id,academic_year_id,academic_term_id,due_at))
 WITH CHECK(author_membership_id=iskool.current_membership_id() AND iskool.assignment_context_allowed(class_id,school_id,academic_year_id,academic_term_id,due_at));
-- Insert-only audit privilege: APS cannot read arbitrary SAMS audit records.
GRANT INSERT ON public.audit_events TO iskool_aps_runtime;
CREATE POLICY audit_events_aps_insert ON public.audit_events FOR INSERT TO iskool_aps_runtime
 WITH CHECK(actor_user_id=iskool.current_user_id() AND actor_membership_id=iskool.current_membership_id()
 AND school_id=iskool.current_school_id() AND iskool.principal_can_access_school(school_id)
 AND entity_type='assignment' AND action IN ('assignment.created','assignment.updated','assignment.published','assignment.archived')
 AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id::text=audit_events.entity_id AND a.school_id=audit_events.school_id AND a.author_membership_id=iskool.current_membership_id()));
