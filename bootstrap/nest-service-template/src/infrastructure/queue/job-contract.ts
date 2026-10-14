export interface FoundationJob<TPayload extends Record<string, unknown>> {
  version: 1;
  correlationId: string;
  actorId?: string;
  idempotencyKey?: string;
  createdAt: string;
  payload: TPayload;
}
