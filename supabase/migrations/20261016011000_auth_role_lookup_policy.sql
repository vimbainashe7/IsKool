-- Authentication resolves membership role keys before issuing scoped tokens.
-- The auth runtime already has SELECT, so complete its RLS access explicitly.

CREATE POLICY roles_auth_context_lookup
ON public.roles
FOR SELECT
TO iskool_auth_runtime
USING (true);
