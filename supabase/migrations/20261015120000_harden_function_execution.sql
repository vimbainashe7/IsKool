-- Pin helper-function resolution and keep the automatic RLS event trigger
-- unavailable as a callable RPC.

ALTER FUNCTION iskool.setting_uuid(text) SET search_path = pg_catalog;
ALTER FUNCTION iskool.current_user_id() SET search_path = pg_catalog;
ALTER FUNCTION iskool.current_school_id() SET search_path = pg_catalog;
ALTER FUNCTION iskool.current_membership_id() SET search_path = pg_catalog;
ALTER FUNCTION iskool.normalize_email(text) SET search_path = pg_catalog;

-- Some hosted projects install this provider helper; a fresh CLI database does
-- not. Preserve the hosted revocation without preventing clean migration replay.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;
