-- This file must be executed through a real restricted-role connection.
BEGIN;
DO $$ BEGIN
 IF has_table_privilege(current_user,'public.students','TRUNCATE') OR has_table_privilege(current_user,'public.students','DELETE') OR has_column_privilege(current_user,'public.students','school_id','UPDATE') THEN RAISE EXCEPTION 'Runtime received excessive privileges'; END IF;
 IF current_user<>'iskool_master_data_test' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Restricted runtime identity required'; END IF;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM public.students; IF n<>1 THEN RAISE EXCEPTION 'School B read leaked'; END IF;
 UPDATE public.students SET given_name='Intrusion',version=version+1 WHERE id='a4000000-0000-4000-8000-000000000002'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'School B write leaked'; END IF;
 BEGIN
  INSERT INTO public.students(school_id,admission_number,given_name,family_name) VALUES('a1000000-0000-4000-8000-000000000002','ATTACK','Wrong','School');
  RAISE EXCEPTION 'Foreign school create accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.student_guardians(student_id,guardian_id,school_id,relationship) VALUES ('a4000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','guardian');
  RAISE EXCEPTION 'Cross-school guardian link accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.enrollments(school_id,student_id,class_id,academic_year_id,academic_term_id,status) VALUES ('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000002','active');
  RAISE EXCEPTION 'Cross-year enrollment accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END; $$;
INSERT INTO public.enrollments(id,school_id,student_id,class_id,academic_year_id,academic_term_id,status) VALUES ('a9000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','active');
DO $$ BEGIN
 BEGIN
  INSERT INTO public.enrollments(school_id,student_id,class_id,academic_year_id,academic_term_id,status) VALUES ('a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','pending');
  RAISE EXCEPTION 'Duplicate open enrollment accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  UPDATE public.students SET status='archived',version=version+1 WHERE id='a4000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Archival with active enrollment accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END; $$;
UPDATE public.enrollments SET status='withdrawn',ended_at=now(),version=version+1 WHERE id='a9000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 BEGIN
  UPDATE public.enrollments SET status='active',ended_at=NULL,version=version+1 WHERE id='a9000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Terminal enrollment revived';
 EXCEPTION WHEN check_violation THEN NULL; END;
END; $$;
-- Registrar has administration rights; teacher and student do not.
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000002',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000002',true);
INSERT INTO public.students(school_id,admission_number,given_name,family_name) VALUES('a1000000-0000-4000-8000-000000000001','A-REGISTRAR','Registrar','Learner');
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.students) THEN RAISE EXCEPTION 'Teacher private record leak'; END IF;
 BEGIN
  INSERT INTO public.students(school_id,admission_number,given_name,family_name) VALUES('a1000000-0000-4000-8000-000000000001','ATTACK','Wrong','Role'); RAISE EXCEPTION 'Teacher mutation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000004',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000004',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.students) THEN RAISE EXCEPTION 'Student private record leak'; END IF;
 BEGIN
  INSERT INTO public.membership_roles(membership_id,role_id) SELECT 'a3000000-0000-4000-8000-000000000004',id FROM public.roles WHERE key='admin'; RAISE EXCEPTION 'Student role escalation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
ROLLBACK;
SELECT 'PASS restricted-role tenant isolation, guardian/year FKs, uniqueness, lifecycle, archival, registrar/teacher/student separation and no role escalation' AS result;
