-- Disposable database runner only.
BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
INSERT INTO public.users(id,email,display_name) VALUES('c2100000-0000-4000-8000-000000000002','submission-other-student@example.test','Other student');
INSERT INTO public.memberships(id,user_id,school_id) VALUES('c3100000-0000-4000-8000-000000000002','c2100000-0000-4000-8000-000000000002',iskool.current_school_id());
INSERT INTO public.membership_roles(membership_id,role_id) SELECT 'c3100000-0000-4000-8000-000000000002',id FROM public.roles WHERE key='student';
INSERT INTO public.students(id,school_id,admission_number,given_name,family_name,membership_id) VALUES('c4100000-0000-4000-8000-000000000002',iskool.current_school_id(),'SUB-002','Other','Student','c3100000-0000-4000-8000-000000000002');
INSERT INTO public.enrollments(id,school_id,student_id,class_id,academic_year_id,academic_term_id,status)
VALUES('c5000000-0000-4000-8000-000000000001',iskool.current_school_id(),'a4000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','active');
INSERT INTO public.enrollments(school_id,student_id,class_id,academic_year_id,academic_term_id,status) VALUES(iskool.current_school_id(),'c4100000-0000-4000-8000-000000000002','b8000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001','active');
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000003',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000003',true);
INSERT INTO public.assignments(id,school_id,class_id,academic_year_id,academic_term_id,author_membership_id,title,instructions,total_marks,due_at)
SELECT ('c9000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,iskool.current_school_id(),'b8000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001',iskool.current_membership_id(),'Submission replay '||n,'Text work',10,clock_timestamp()+interval '1 day' FROM generate_series(1,3) n;
UPDATE public.assignments SET status='published',version=version+1 WHERE id IN ('c9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000003');
COMMIT;
-- Simulate elapsed deadline only in this explicitly disposable fixture.
ALTER TABLE public.assignments DISABLE TRIGGER assignments_validate;
UPDATE public.assignments SET due_at=clock_timestamp()-interval '1 hour' WHERE id='c9000000-0000-4000-8000-000000000003';
ALTER TABLE public.assignments ENABLE TRIGGER assignments_validate;
