-- APS reads SAMS through its internal API. These private, principal-bound
-- booleans are only the database integrity backstop; no master-table grants.
CREATE FUNCTION iskool.student_assignment_context(target_school uuid,target_class uuid,target_year uuid,target_term uuid,target_student uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT target_school=iskool.current_school_id() AND iskool.principal_can_access_school(target_school)
 AND EXISTS(SELECT 1 FROM public.membership_roles mr JOIN public.roles r ON r.id=mr.role_id WHERE mr.membership_id=iskool.current_membership_id() AND r.key='student')
 AND EXISTS(SELECT 1 FROM public.students s JOIN public.enrollments e ON e.student_id=s.id AND e.school_id=s.school_id
 JOIN public.academic_terms t ON t.id=e.academic_term_id AND t.school_id=e.school_id AND t.academic_year_id=e.academic_year_id
 JOIN public.academic_years y ON y.id=t.academic_year_id AND y.school_id=t.school_id
 WHERE s.membership_id=iskool.current_membership_id() AND s.school_id=target_school AND s.status='active' AND (target_student IS NULL OR s.id=target_student)
 AND e.class_id=target_class AND e.academic_year_id=target_year AND e.academic_term_id=target_term AND e.status='active'
 AND (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Harare')::date BETWEEN t.starts_on AND t.ends_on
 AND (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Harare')::date BETWEEN y.starts_on AND y.ends_on);
$$;
REVOKE ALL ON FUNCTION iskool.student_assignment_context(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.student_assignment_context(uuid,uuid,uuid,uuid,uuid) TO iskool_aps_runtime;
CREATE POLICY assignments_student_read ON public.assignments FOR SELECT TO iskool_aps_runtime
 USING(status='published' AND iskool.student_assignment_context(school_id,class_id,academic_year_id,academic_term_id));
CREATE INDEX assignments_student_feed_idx ON public.assignments(school_id,status,published_at DESC,id DESC);

-- Small private ledger, pruned per student on every request; ten accepted
-- request budgets per rolling minute, including duplicates and rejected work.
CREATE TABLE iskool.submission_requests (
 id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 membership_id uuid NOT NULL, school_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), used boolean NOT NULL DEFAULT false
);
CREATE INDEX submission_requests_student_time_idx ON iskool.submission_requests(student_id,created_at);
ALTER TABLE iskool.submission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE iskool.submission_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON iskool.submission_requests FROM PUBLIC,anon,authenticated,service_role,iskool_aps_runtime,iskool_sams_runtime;
CREATE FUNCTION iskool.consume_submission_request(target_student uuid,request_token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT iskool.principal_can_access_school(iskool.current_school_id()) OR NOT EXISTS(
 SELECT 1 FROM public.students s JOIN public.membership_roles mr ON mr.membership_id=s.membership_id JOIN public.roles r ON r.id=mr.role_id
 WHERE s.id=target_student AND s.membership_id=iskool.current_membership_id() AND s.school_id=iskool.current_school_id() AND s.status='active' AND r.key='student') THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target_student::text,73053));
 DELETE FROM iskool.submission_requests WHERE student_id=target_student AND created_at<=clock_timestamp()-interval '1 minute';
 IF (SELECT count(*) FROM iskool.submission_requests WHERE student_id=target_student)>=10 THEN RETURN false; END IF;
 INSERT INTO iskool.submission_requests(id,student_id,membership_id,school_id) VALUES(request_token,target_student,iskool.current_membership_id(),iskool.current_school_id());
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION iskool.consume_submission_request(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.consume_submission_request(uuid,uuid) TO iskool_aps_runtime;

ALTER TABLE public.assignments ADD CONSTRAINT assignments_id_school_unique UNIQUE(id,school_id);
CREATE TABLE public.submissions (
 id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(), school_id uuid NOT NULL,
 assignment_id uuid NOT NULL,
 student_id uuid NOT NULL, student_membership_id uuid NOT NULL,
 request_token uuid NOT NULL UNIQUE,
 text text NOT NULL CHECK(length(btrim(text)) BETWEEN 1 AND 10000),
 attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 3),
 submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 status text NOT NULL CHECK(status IN ('submitted','late')),
 FOREIGN KEY(assignment_id,school_id) REFERENCES public.assignments(id,school_id) ON DELETE RESTRICT,
 FOREIGN KEY(student_id,school_id) REFERENCES public.students(id,school_id) ON DELETE RESTRICT,
 FOREIGN KEY(student_membership_id,school_id) REFERENCES public.memberships(id,school_id) ON DELETE RESTRICT,
 UNIQUE(assignment_id,student_id,attempt)
);
CREATE INDEX submissions_assignment_student_idx ON public.submissions(assignment_id,student_id);
CREATE INDEX submissions_student_page_idx ON public.submissions(school_id,student_membership_id,assignment_id,attempt DESC);
-- Append-only attempts. A new attempt never rewrites the original timestamp.
CREATE FUNCTION iskool.validate_submission_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE task public.assignments; previous public.submissions; budget_used boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.student_id::text,73053));
 SELECT * INTO task FROM public.assignments WHERE id=NEW.assignment_id FOR SHARE;
 IF task.id IS NULL OR task.status<>'published' OR NEW.school_id<>task.school_id OR NEW.student_membership_id<>iskool.current_membership_id()
 OR NOT iskool.student_assignment_context(task.school_id,task.class_id,task.academic_year_id,task.academic_term_id,NEW.student_id) THEN RAISE EXCEPTION 'Enrollment or assignment unavailable' USING ERRCODE='42501'; END IF;
 UPDATE iskool.submission_requests SET used=true WHERE id=NEW.request_token AND student_id=NEW.student_id AND membership_id=iskool.current_membership_id()
 AND school_id=NEW.school_id AND NOT used AND created_at>clock_timestamp()-interval '1 minute' RETURNING used INTO budget_used;
 IF budget_used IS DISTINCT FROM true THEN RAISE EXCEPTION 'Submission request budget required' USING ERRCODE='23514'; END IF;
 SELECT * INTO previous FROM public.submissions WHERE assignment_id=NEW.assignment_id AND student_id=NEW.student_id ORDER BY attempt DESC LIMIT 1;
 IF NEW.attempt<>COALESCE(previous.attempt,0)+1 THEN RAISE EXCEPTION 'Submission changed; reload first' USING ERRCODE='23514'; END IF;
 IF previous.text=btrim(NEW.text) AND previous.submitted_at>clock_timestamp()-interval '30 seconds' THEN RAISE EXCEPTION 'Duplicate submission' USING ERRCODE='23514'; END IF;
 NEW.text=btrim(NEW.text); NEW.submitted_at=clock_timestamp();
 NEW.status=CASE WHEN NEW.submitted_at>task.due_at THEN 'late' ELSE 'submitted' END;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_submission_insert() FROM PUBLIC;
CREATE TRIGGER submissions_validate BEFORE INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION iskool.validate_submission_insert();
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.submissions FROM PUBLIC,anon,authenticated,service_role,iskool_sams_runtime,iskool_aps_runtime;
GRANT SELECT,INSERT ON public.submissions TO iskool_aps_runtime;
CREATE POLICY submissions_student_read ON public.submissions FOR SELECT TO iskool_aps_runtime
 USING(student_membership_id=iskool.current_membership_id() AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id AND a.status='published' AND iskool.student_assignment_context(a.school_id,a.class_id,a.academic_year_id,a.academic_term_id,student_id)));
CREATE POLICY submissions_student_insert ON public.submissions FOR INSERT TO iskool_aps_runtime
 WITH CHECK(student_membership_id=iskool.current_membership_id() AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id AND a.status='published' AND iskool.student_assignment_context(a.school_id,a.class_id,a.academic_year_id,a.academic_term_id,student_id)));
CREATE POLICY submissions_teacher_read ON public.submissions FOR SELECT TO iskool_aps_runtime
 USING(EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id AND a.school_id=submissions.school_id AND a.author_membership_id=iskool.current_membership_id() AND iskool.assignment_context_allowed(a.class_id,a.school_id,a.academic_year_id,a.academic_term_id,a.due_at)));
CREATE POLICY audit_events_submission_insert ON public.audit_events FOR INSERT TO iskool_aps_runtime
 WITH CHECK(actor_user_id=iskool.current_user_id() AND actor_membership_id=iskool.current_membership_id() AND school_id=iskool.current_school_id()
 AND iskool.principal_can_access_school(school_id) AND entity_type='submission' AND action='submission.created'
 AND EXISTS(SELECT 1 FROM public.submissions s WHERE s.id::text=audit_events.entity_id AND s.school_id=audit_events.school_id AND s.student_membership_id=iskool.current_membership_id()));
