-- VIM-48 authentication persistence and narrow pre-authentication runtime.
-- Supabase Auth remains intentionally unused.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'iskool_auth_runtime') THEN
    CREATE ROLE iskool_auth_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION iskool.normalize_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(email));
$$;

CREATE OR REPLACE FUNCTION iskool.set_user_email_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email_normalized = iskool.normalize_email(NEW.email);
  RETURN NEW;
END;
$$;

ALTER TABLE public.users
  ADD COLUMN email_normalized text;

UPDATE public.users
SET email_normalized = iskool.normalize_email(email);

ALTER TABLE public.users
  ALTER COLUMN email_normalized SET NOT NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized);

CREATE TABLE public.user_credentials (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_credentials_password_hash_not_blank CHECK (length(btrim(password_hash)) > 0)
);

CREATE TABLE public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
  refresh_family_id uuid NOT NULL DEFAULT extensions.gen_random_uuid(),
  allowed_scopes text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  reuse_detected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_allowed_scopes_not_empty CHECK (cardinality(allowed_scopes) > 0),
  CONSTRAINT auth_sessions_allowed_scopes_check CHECK (allowed_scopes <@ ARRAY['aps', 'sams']::text[]),
  CONSTRAINT auth_sessions_expires_after_created CHECK (expires_at > created_at)
);

CREATE TABLE public.auth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.auth_sessions(id) ON DELETE CASCADE,
  token_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  replaced_by_id uuid REFERENCES public.auth_refresh_tokens(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  reuse_detected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_refresh_tokens_digest_unique UNIQUE (token_digest),
  CONSTRAINT auth_refresh_tokens_digest_not_blank CHECK (length(btrim(token_digest)) > 0),
  CONSTRAINT auth_refresh_tokens_expires_after_created CHECK (expires_at > created_at),
  CONSTRAINT auth_refresh_tokens_not_self_replaced CHECK (replaced_by_id IS NULL OR replaced_by_id <> id)
);

CREATE TABLE public.auth_login_continuations (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verifier_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_login_continuations_digest_unique UNIQUE (verifier_digest),
  CONSTRAINT auth_login_continuations_digest_not_blank CHECK (length(btrim(verifier_digest)) > 0),
  CONSTRAINT auth_login_continuations_expires_after_created CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_user_id_idx ON public.auth_sessions(user_id);
CREATE INDEX auth_sessions_membership_id_idx ON public.auth_sessions(membership_id);
CREATE INDEX auth_sessions_active_idx ON public.auth_sessions(user_id, revoked_at, expires_at);
CREATE INDEX auth_refresh_tokens_session_id_idx ON public.auth_refresh_tokens(session_id);
CREATE INDEX auth_login_continuations_user_id_idx ON public.auth_login_continuations(user_id);

CREATE TRIGGER users_set_email_normalized
BEFORE INSERT OR UPDATE OF email ON public.users
FOR EACH ROW
EXECUTE FUNCTION iskool.set_user_email_normalized();

CREATE TRIGGER user_credentials_touch_updated_at
BEFORE UPDATE ON public.user_credentials
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER auth_sessions_touch_updated_at
BEFORE UPDATE ON public.auth_sessions
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER auth_refresh_tokens_touch_updated_at
BEFORE UPDATE ON public.auth_refresh_tokens
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

CREATE TRIGGER auth_login_continuations_touch_updated_at
BEFORE UPDATE ON public.auth_login_continuations
FOR EACH ROW
EXECUTE FUNCTION iskool.touch_updated_at();

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_refresh_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE public.auth_login_continuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_login_continuations FORCE ROW LEVEL SECURITY;

CREATE POLICY users_auth_identity_lookup
ON public.users
FOR SELECT
TO iskool_auth_runtime
USING (true);

CREATE POLICY schools_auth_context_lookup
ON public.schools
FOR SELECT
TO iskool_auth_runtime
USING (true);

CREATE POLICY memberships_auth_context_lookup
ON public.memberships
FOR SELECT
TO iskool_auth_runtime
USING (true);

CREATE POLICY membership_roles_auth_context_lookup
ON public.membership_roles
FOR SELECT
TO iskool_auth_runtime
USING (true);

CREATE POLICY user_credentials_auth_lookup
ON public.user_credentials
FOR SELECT
TO iskool_auth_runtime
USING (true);

CREATE POLICY auth_sessions_auth_manage
ON public.auth_sessions
FOR ALL
TO iskool_auth_runtime
USING (true)
WITH CHECK (true);

CREATE POLICY auth_refresh_tokens_auth_manage
ON public.auth_refresh_tokens
FOR ALL
TO iskool_auth_runtime
USING (true)
WITH CHECK (true);

CREATE POLICY auth_login_continuations_auth_manage
ON public.auth_login_continuations
FOR ALL
TO iskool_auth_runtime
USING (true)
WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO iskool_auth_runtime;
GRANT SELECT ON public.users TO iskool_auth_runtime;
GRANT SELECT ON public.schools TO iskool_auth_runtime;
GRANT SELECT ON public.memberships TO iskool_auth_runtime;
GRANT SELECT ON public.roles TO iskool_auth_runtime;
GRANT SELECT ON public.membership_roles TO iskool_auth_runtime;
GRANT SELECT ON public.user_credentials TO iskool_auth_runtime;
GRANT SELECT, INSERT, UPDATE ON public.auth_sessions TO iskool_auth_runtime;
GRANT SELECT, INSERT, UPDATE ON public.auth_refresh_tokens TO iskool_auth_runtime;
GRANT SELECT, INSERT, UPDATE ON public.auth_login_continuations TO iskool_auth_runtime;

REVOKE ALL ON FUNCTION iskool.normalize_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION iskool.set_user_email_normalized() FROM PUBLIC;
