-- VIM-71. Additive shared-identity fields; SAMS owns the write workflow.
ALTER TABLE public.schools
  ADD COLUMN logo_data_url text,
  ADD COLUMN logo_present boolean NOT NULL DEFAULT false,
  ADD COLUMN branding_version integer NOT NULL DEFAULT 1 CHECK (branding_version > 0),
  ADD CONSTRAINT schools_logo_consistent CHECK (logo_present = (logo_data_url IS NOT NULL)),
  ADD CONSTRAINT schools_logo_bounded CHECK (logo_data_url IS NULL OR
    (octet_length(logo_data_url) <= 65559 AND logo_data_url ~ '^data:image/webp;base64,[A-Za-z0-9+/]+={0,2}$'));
ALTER TABLE public.users ADD COLUMN profile_version integer NOT NULL DEFAULT 1 CHECK (profile_version > 0);

CREATE FUNCTION iskool.can_manage_school_settings(target_school_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT iskool.principal_can_access_school(target_school_id) AND EXISTS (
    SELECT 1 FROM public.membership_roles mr JOIN public.roles r ON r.id=mr.role_id
    WHERE mr.membership_id=iskool.current_membership_id() AND r.key='admin'
  );
$$;
REVOKE ALL ON FUNCTION iskool.can_manage_school_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iskool.can_manage_school_settings(uuid) TO iskool_sams_runtime;

CREATE POLICY schools_admin_branding_update ON public.schools FOR UPDATE TO iskool_sams_runtime
  USING (iskool.can_manage_school_settings(id)) WITH CHECK (iskool.can_manage_school_settings(id));
CREATE POLICY users_admin_own_profile_update ON public.users FOR UPDATE TO iskool_sams_runtime
  USING (id=iskool.current_user_id() AND iskool.can_manage_school_settings(iskool.current_school_id()))
  WITH CHECK (id=iskool.current_user_id() AND iskool.can_manage_school_settings(iskool.current_school_id()));
GRANT UPDATE (name,logo_data_url,logo_present,branding_version,updated_at) ON public.schools TO iskool_sams_runtime;
GRANT UPDATE (display_name,profile_version,updated_at) ON public.users TO iskool_sams_runtime;

CREATE FUNCTION iskool.validate_identity_settings_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF TG_TABLE_NAME='schools' THEN
    IF ROW(NEW.name,NEW.logo_data_url,NEW.logo_present,NEW.branding_version) IS DISTINCT FROM
       ROW(OLD.name,OLD.logo_data_url,OLD.logo_present,OLD.branding_version) THEN
      IF NEW.branding_version<>OLD.branding_version+1 OR length(btrim(NEW.name)) NOT BETWEEN 1 AND 200 THEN
        RAISE EXCEPTION 'Invalid school branding version or name' USING ERRCODE='23514';
      END IF;
    END IF;
  ELSE
    IF ROW(NEW.display_name,NEW.profile_version) IS DISTINCT FROM ROW(OLD.display_name,OLD.profile_version) THEN
      IF NEW.profile_version<>OLD.profile_version+1 OR length(btrim(NEW.display_name)) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Invalid own profile version or name' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION iskool.validate_identity_settings_version() FROM PUBLIC;
CREATE TRIGGER school_branding_version BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION iskool.validate_identity_settings_version();
CREATE TRIGGER user_profile_version BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION iskool.validate_identity_settings_version();
