BEGIN;
SELECT set_config('iskool.user_id','a2000000-0000-4000-8000-000000000001',true),set_config('iskool.membership_id','a3000000-0000-4000-8000-000000000001',true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
DO $$ DECLARE changed integer; BEGIN
 IF NOT iskool.can_manage_school_settings('a1000000-0000-4000-8000-000000000001') OR iskool.can_manage_school_settings('a1000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'School settings context invalid'; END IF;
 UPDATE public.schools SET name='Updated School',branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001' AND branding_version=1;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Own school update failed'; END IF;
 UPDATE public.users SET display_name='Updated Admin',profile_version=profile_version+1 WHERE id='a2000000-0000-4000-8000-000000000001' AND profile_version=1;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Own profile update failed'; END IF;
 UPDATE public.schools SET name='Stale edit',branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001' AND branding_version=1;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Stale update succeeded'; END IF;
 UPDATE public.schools SET name='Foreign',branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000002';
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Foreign school changed'; END IF;
 UPDATE public.users SET display_name='Other user',profile_version=profile_version+1 WHERE id='a2000000-0000-4000-8000-000000000003';
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Other user changed'; END IF;
 BEGIN UPDATE public.schools SET name='Missing version increment' WHERE id='a1000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Version invariant missing'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.schools SET logo_present=true,branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Logo consistency missing'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.schools SET logo_data_url='https://foreign.example/logo.svg',logo_present=true,branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Remote URL accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.users SET email='elevated@example.test' WHERE id='a2000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'Email write granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.schools SET status='inactive' WHERE id='a1000000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'School status write granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS school Admin own profile/branding, tenant/user isolation, stale versions, logo constraints and column privileges';
END; $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE actor integer; changed integer; BEGIN
 FOR actor IN 2..4 LOOP
  PERFORM set_config('iskool.user_id','a2000000-0000-4000-8000-'||lpad(actor::text,12,'0'),true),set_config('iskool.membership_id','a3000000-0000-4000-8000-'||lpad(actor::text,12,'0'),true),set_config('iskool.school_id','a1000000-0000-4000-8000-000000000001',true);
  IF iskool.can_manage_school_settings('a1000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Non-Admin settings authority'; END IF;
  UPDATE public.schools SET name='Denied',branding_version=branding_version+1 WHERE id='a1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Non-Admin school write succeeded'; END IF;
  UPDATE public.users SET display_name='Denied',profile_version=profile_version+1 WHERE id=iskool.current_user_id();
  GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>0 THEN RAISE EXCEPTION 'Non-Admin profile write succeeded'; END IF;
 END LOOP;
 RAISE NOTICE 'PASS Registrar, Teacher and Student cannot mutate Admin settings through restricted SQL';
END; $$;
ROLLBACK;
