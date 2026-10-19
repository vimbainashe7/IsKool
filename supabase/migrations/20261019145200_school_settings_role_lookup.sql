-- Align fresh replay with the hosted role-catalogue RLS setting. Runtime
-- authorization may read only role keys assigned to its active membership.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;

CREATE POLICY roles_sams_current_membership_lookup
ON public.roles FOR SELECT TO iskool_sams_runtime
USING (
  iskool.principal_can_access_school(iskool.current_school_id())
  AND EXISTS (
    SELECT 1 FROM public.membership_roles mr
    WHERE mr.membership_id=iskool.current_membership_id()
      AND mr.role_id=roles.id
  )
);
