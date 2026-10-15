-- VIM-50 privileged action audit foundation.

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  actor_membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  request_id text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_action_not_blank CHECK (length(btrim(action)) > 0),
  CONSTRAINT audit_events_entity_type_not_blank CHECK (length(btrim(entity_type)) > 0),
  CONSTRAINT audit_events_entity_id_not_blank CHECK (length(btrim(entity_id)) > 0),
  CONSTRAINT audit_events_request_id_not_blank CHECK (length(btrim(request_id)) > 0)
);

CREATE INDEX audit_events_school_created_at_idx ON public.audit_events(school_id, created_at DESC);
CREATE INDEX audit_events_actor_created_at_idx ON public.audit_events(actor_user_id, created_at DESC);
CREATE INDEX audit_events_entity_idx ON public.audit_events(entity_type, entity_id);
CREATE INDEX audit_events_request_id_idx ON public.audit_events(request_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_events_runtime_insert
ON public.audit_events
FOR INSERT
TO iskool_sams_runtime
WITH CHECK (
  actor_user_id = iskool.current_user_id()
  AND actor_membership_id = iskool.current_membership_id()
  AND school_id = iskool.current_school_id()
  AND iskool.principal_can_access_school(school_id)
);

CREATE POLICY audit_events_runtime_read
ON public.audit_events
FOR SELECT
TO iskool_sams_runtime
USING (iskool.principal_can_access_school(school_id));

GRANT SELECT, INSERT ON public.audit_events TO iskool_sams_runtime;
