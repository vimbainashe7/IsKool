-- Real restricted LOGIN role, not a superuser connection.
BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000004',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000004',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.assignments)<>2 THEN RAISE EXCEPTION 'Published feed or draft privacy failed'; END IF;
 IF NOT iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Budget rejected valid student'; END IF;
END; $$;
INSERT INTO public.submissions(id,school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,submitted_at,status)
VALUES('c2000000-0000-4000-8000-000000000001',iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000001',' First answer ',1,'2000-01-01','late');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.submissions WHERE text='First answer' AND status='submitted' AND submitted_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Server time/status/trim failed'; END IF;
 IF has_table_privilege(current_user,'public.submissions','UPDATE') OR has_table_privilege(current_user,'public.submissions','DELETE') OR has_table_privilege(current_user,'public.submissions','TRUNCATE') THEN RAISE EXCEPTION 'Immutable attempts have destructive privileges'; END IF;
 IF has_table_privilege('service_role','public.submissions','SELECT') OR has_table_privilege('anon','public.submissions','SELECT') OR has_table_privilege(current_user,'iskool.submission_requests','SELECT') THEN RAISE EXCEPTION 'Private or provider privileges leaked'; END IF;
 PERFORM iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002');
 BEGIN INSERT INTO public.submissions(school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
 VALUES(iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000002','First answer',2,'submitted'); RAISE EXCEPTION '30-second duplicate accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END; $$;
INSERT INTO public.submissions(school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
VALUES(iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000002','Revised answer',2,'submitted');
SELECT iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000003');
INSERT INTO public.submissions(school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
VALUES(iskool.current_school_id(),'c9000000-0000-4000-8000-000000000003','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000003','Late work',1,'submitted');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.submissions WHERE text='Late work' AND status='late') THEN RAISE EXCEPTION 'Late work status incorrect'; END IF;
 BEGIN
  PERFORM iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000004');
  INSERT INTO public.submissions(id,school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
  VALUES('c2000000-0000-4000-8000-000000000004',iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000004','Third answer',3,'submitted');
  INSERT INTO public.audit_events(actor_user_id,actor_membership_id,school_id,action,entity_type,entity_id,request_id) VALUES(iskool.current_user_id(),iskool.current_membership_id(),iskool.current_school_id(),'submission.created','submission','c2000000-0000-4000-8000-000000000004','');
  RAISE EXCEPTION 'Invalid audit accepted'; EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.submissions WHERE attempt=3) THEN RAISE EXCEPTION 'Failed audit left a submission'; END IF;
 FOR n IN 4..10 LOOP IF NOT iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001',('c1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid) THEN RAISE EXCEPTION 'Premature rate rejection'; END IF; END LOOP;
 IF iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000011') THEN RAISE EXCEPTION 'Eleventh request accepted'; END IF;
END; $$;
INSERT INTO public.audit_events(actor_user_id,actor_membership_id,school_id,action,entity_type,entity_id,request_id) VALUES(iskool.current_user_id(),iskool.current_membership_id(),iskool.current_school_id(),'submission.created','submission','c2000000-0000-4000-8000-000000000001','submission-replay');
INSERT INTO public.submissions(school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
VALUES(iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000004','Third answer',3,'submitted');
DO $$ BEGIN
 BEGIN INSERT INTO public.submissions(school_id,assignment_id,student_id,student_membership_id,request_token,text,attempt,status)
 VALUES(iskool.current_school_id(),'c9000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'c1000000-0000-4000-8000-000000000005','Fourth answer',4,'submitted'); RAISE EXCEPTION 'Fourth attempt accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END; $$;
SELECT set_config('iskool.user_id','c2100000-0000-4000-8000-000000000002',true),set_config('iskool.membership_id','c3100000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.submissions) THEN RAISE EXCEPTION 'Other enrolled student read private work'; END IF;
 IF iskool.consume_submission_request('a4000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000012') THEN RAISE EXCEPTION 'Other student spent victim budget'; END IF;
END; $$;
SELECT set_config('iskool.school_id','a1000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.assignments) OR EXISTS(SELECT 1 FROM public.submissions) THEN RAISE EXCEPTION 'School boundary leaked'; END IF; END; $$;
SELECT set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.submissions)<>4 THEN RAISE EXCEPTION 'Author teacher queue missing attempts'; END IF; END; $$;
SELECT set_config('iskool.user_id','b2000000-0000-4000-8000-000000000006',true),set_config('iskool.membership_id','b3000000-0000-4000-8000-000000000006',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.submissions) THEN RAISE EXCEPTION 'Co-teacher private submission leak'; END IF; END; $$;
COMMIT;
SELECT 'PASS Student published feed, draft privacy, immutable server time, resubmission, late status, 30s dedup, 10/min budget, atomic audits and co-teacher denial';
