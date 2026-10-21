-- Invoked only by the disposable database test runner after master-data fixtures.
BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
INSERT INTO public.academic_years(id,school_id,label,starts_on,ends_on) VALUES('b6000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Assignment replay',CURRENT_DATE-INTERVAL '10 years',CURRENT_DATE+INTERVAL '10 years');
INSERT INTO public.academic_terms(id,school_id,academic_year_id,label,starts_on,ends_on) VALUES('b7000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','Assignment replay term',CURRENT_DATE-INTERVAL '10 years',CURRENT_DATE+INTERVAL '10 years');
INSERT INTO public.classes(id,school_id,academic_year_id,name) VALUES('b8000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','Assignment replay class');
INSERT INTO public.class_teachers(class_id,membership_id,school_id,academic_year_id) VALUES('b8000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001');
INSERT INTO public.users(id,email,display_name) VALUES('b2000000-0000-4000-8000-000000000006','assignment-coteacher@example.test','Assignment Co-teacher');
INSERT INTO public.memberships(id,user_id,school_id) VALUES('b3000000-0000-4000-8000-000000000006','b2000000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000001');
INSERT INTO public.membership_roles(membership_id,role_id) SELECT 'b3000000-0000-4000-8000-000000000006',id FROM public.roles WHERE key='teacher';
INSERT INTO public.class_teachers(class_id,membership_id,school_id,academic_year_id) VALUES('b8000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000006','a1000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001');
COMMIT;
