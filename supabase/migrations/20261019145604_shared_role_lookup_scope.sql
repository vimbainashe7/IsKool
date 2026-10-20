-- Shared identity role lookups are also used by the existing APS boundary.
-- Preserve that contract with the same active, current-membership predicate.
ALTER POLICY roles_sams_current_membership_lookup ON public.roles
  RENAME TO roles_runtime_current_membership_lookup;
ALTER POLICY roles_runtime_current_membership_lookup ON public.roles
  TO iskool_sams_runtime, iskool_aps_runtime;
