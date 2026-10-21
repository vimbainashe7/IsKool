-- Disposable replay only; authenticated through an APS restricted LOGIN role.
BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
INSERT INTO public.assignments(id,school_id,class_id,academic_year_id,academic_term_id,author_membership_id,title,instructions,total_marks,due_at)
VALUES('a9000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Algebra','Show working',20,'2026-04-20T12:00:00Z');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.assignments)<>1 THEN RAISE EXCEPTION 'Own draft not visible'; END IF;
 BEGIN UPDATE public.assignments SET status='published',version=version+1; RAISE EXCEPTION 'Past deadline published'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.assignments SET title=' ',version=version+1; RAISE EXCEPTION 'Blank title accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.assignments SET version=version+2; RAISE EXCEPTION 'Invalid version accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.assignments(school_id,class_id,academic_year_id,academic_term_id,author_membership_id,title,instructions,total_marks,due_at)
 VALUES('a1000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000002','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','Denied','Wrong class',20,'2026-04-20'); RAISE EXCEPTION 'Unauthorized class accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_table_privilege(current_user,'public.assignments','DELETE') OR has_table_privilege(current_user,'public.assignments','TRUNCATE') THEN RAISE EXCEPTION 'Destructive privileges present'; END IF;
 IF has_table_privilege('anon','public.assignments','SELECT') OR has_table_privilege('service_role','public.assignments','SELECT') OR has_function_privilege('anon','iskool.assignment_context_allowed(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Provider privileges leaked'; END IF;
END; $$;
UPDATE public.assignments SET due_at=CURRENT_TIMESTAMP+INTERVAL '1 day',version=version+1 WHERE id='a9000000-0000-4000-8000-000000000001';
UPDATE public.assignments SET status='published',version=version+1 WHERE id='a9000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.assignments WHERE status='published' AND published_at BETWEEN CURRENT_TIMESTAMP-INTERVAL '1 minute' AND clock_timestamp()) THEN RAISE EXCEPTION 'Publication timestamp not server generated'; END IF;
 BEGIN UPDATE public.assignments SET title='Changed after publishing',version=version+1; RAISE EXCEPTION 'Published content edited'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.assignments SET status='archived',version=version+1;
  INSERT INTO public.audit_events(actor_user_id,actor_membership_id,school_id,action,entity_type,entity_id,request_id) VALUES(iskool.current_user_id(),iskool.current_membership_id(),iskool.current_school_id(),'assignment.archived','assignment','a9000000-0000-4000-8000-000000000001','');
  RAISE EXCEPTION 'Invalid audit accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF NOT EXISTS(SELECT 1 FROM public.assignments WHERE status='published' AND version=3) THEN RAISE EXCEPTION 'Failed audit did not roll back mutation'; END IF;
END; $$;
UPDATE public.assignments SET status='archived',version=version+1;
INSERT INTO public.audit_events(actor_user_id,actor_membership_id,school_id,action,entity_type,entity_id,request_id) VALUES(iskool.current_user_id(),iskool.current_membership_id(),iskool.current_school_id(),'assignment.archived','assignment','a9000000-0000-4000-8000-000000000001','assignment-replay');
DO $$ BEGIN
 BEGIN UPDATE public.assignments SET status='draft',version=version+1; RAISE EXCEPTION 'Archive reopened'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF has_table_privilege(current_user,'public.audit_events','SELECT') OR has_table_privilege(current_user,'public.audit_events','UPDATE') THEN RAISE EXCEPTION 'APS has excess audit privileges'; END IF;
END; $$;
SELECT set_config('iskool.user_id','b2000000-0000-4000-8000-000000000006',true),set_config('iskool.membership_id','b3000000-0000-4000-8000-000000000006',true);
DO $$ DECLARE changed integer; BEGIN
 IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Co-teacher read another author assignment'; END IF;
 UPDATE public.assignments SET status='archived',version=version+1; GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Co-teacher mutated another author assignment'; END IF;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000004',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000004',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Student read teacher drafts'; END IF; END; $$;
DO $$ BEGIN
 BEGIN INSERT INTO public.audit_events(actor_user_id,actor_membership_id,school_id,action,entity_type,entity_id,request_id) VALUES(iskool.current_user_id(),iskool.current_membership_id(),iskool.current_school_id(),'assignment.published','assignment','a9000000-0000-4000-8000-000000000001','forged-student-audit'); RAISE EXCEPTION 'Student forged Teacher assignment audit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Admin assumed teacher ownership'; END IF; END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.assignments) THEN RAISE EXCEPTION 'Cross-school read'; END IF; END; $$;
DO $$ DECLARE changed integer; BEGIN UPDATE public.assignments SET status='archived',version=version+1; GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Cross-school mutation'; END IF; END; $$;
COMMIT;
SELECT 'PASS assignment author/class/tenant isolation, deadline/version/content constraints and least privileges' AS result;
