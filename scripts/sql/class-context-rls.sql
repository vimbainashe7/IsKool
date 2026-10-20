-- Disposable replay only: run through test-sams-master-data.mjs, never hosted data.
BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
UPDATE public.students SET membership_id='a3000000-0000-4000-8000-000000000004',version=version+1 WHERE id='a4000000-0000-4000-8000-000000000001';
INSERT INTO public.students(id,school_id,admission_number,given_name,family_name) VALUES('a4000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','A-OTHER','Other','Student');
INSERT INTO public.classes(id,school_id,academic_year_id,name) VALUES('a8000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','Other class');
INSERT INTO public.class_teachers(class_id,membership_id,school_id,academic_year_id) VALUES('a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001');
INSERT INTO public.enrollments(school_id,student_id,class_id,academic_year_id,academic_term_id,status) VALUES
('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','active'),
('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','active'),
('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000003','a8000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','active');
DO $$ BEGIN
 BEGIN UPDATE public.students SET membership_id='a3000000-0000-4000-8000-000000000004',version=version+1 WHERE id='a4000000-0000-4000-8000-000000000003'; RAISE EXCEPTION 'Duplicate account link accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN UPDATE public.students SET membership_id='a3000000-0000-4000-8000-000000000003',version=version+1 WHERE id='a4000000-0000-4000-8000-000000000003'; RAISE EXCEPTION 'Teacher linked as student'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.class_teachers(class_id,membership_id,school_id,academic_year_id) VALUES('a8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Student assigned as teacher'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF has_function_privilege('anon','iskool.can_read_school_class(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Private policy helper exposed to anon'; END IF;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000004',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000004',true);
DO $$ DECLARE changed integer; BEGIN
 IF (SELECT count(*) FROM public.students)<>1 OR (SELECT count(*) FROM public.enrollments)<>1 OR (SELECT count(*) FROM public.classes)<>1 OR EXISTS(SELECT 1 FROM public.class_teachers) OR EXISTS(SELECT 1 FROM public.guardians) THEN RAISE EXCEPTION 'Student private record/class scope leaked'; END IF;
 UPDATE public.students SET given_name='Escalated',version=version+1; GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Student mutated master data'; END IF;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true);
DO $$ DECLARE changed integer; BEGIN
 IF (SELECT count(*) FROM public.students)<>2 OR (SELECT count(*) FROM public.enrollments)<>2 OR (SELECT count(*) FROM public.classes)<>1 OR (SELECT count(*) FROM public.class_teachers)<>1 OR EXISTS(SELECT 1 FROM public.guardians) THEN RAISE EXCEPTION 'Teacher class/private-data scope incorrect'; END IF;
 UPDATE public.class_teachers SET status='revoked',version=version+1; GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Teacher changed teaching authority'; END IF;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true);
UPDATE public.class_teachers SET status='revoked',version=version+1;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.students) OR EXISTS(SELECT 1 FROM public.enrollments) OR EXISTS(SELECT 1 FROM public.classes) OR EXISTS(SELECT 1 FROM public.class_teachers) THEN RAISE EXCEPTION 'Revoked teacher assignment retains class authority'; END IF; END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true);
UPDATE public.class_teachers SET status='active',version=version+1;
COMMIT;
SELECT 'PASS student account uniqueness, role validation, own-student privacy, assigned-class teacher scope and immediate revocation' AS result;
