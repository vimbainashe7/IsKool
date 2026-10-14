import { AuthorizationAction } from './authorization';

export type PrivilegedActionDenyReason =
  | 'RECENT_AUTHENTICATION_REQUIRED'
  | 'SECOND_APPROVAL_REQUIRED'
  | 'SECOND_APPROVER_MUST_DIFFER';

export type PrivilegedActionDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: PrivilegedActionDenyReason };

export interface SecondApprovalInput {
  readonly required: boolean;
  readonly approverUserId?: string;
}

export interface PrivilegedActionInput {
  readonly action: AuthorizationAction;
  readonly actorUserId?: string;
  readonly authenticatedAt: Date;
  readonly now?: Date;
  readonly recentAuthenticationSeconds: number;
  readonly secondApproval?: SecondApprovalInput;
}

export class PrivilegedActionPolicy {
  evaluate(input: PrivilegedActionInput): PrivilegedActionDecision {
    const now = input.now ?? new Date();
    const authAgeMs = now.getTime() - input.authenticatedAt.getTime();
    if (authAgeMs < 0 || authAgeMs > input.recentAuthenticationSeconds * 1000) {
      return { allowed: false, reason: 'RECENT_AUTHENTICATION_REQUIRED' };
    }

    if (input.secondApproval?.required) {
      if (!input.secondApproval.approverUserId) {
        return { allowed: false, reason: 'SECOND_APPROVAL_REQUIRED' };
      }
      if (input.actorUserId && input.secondApproval.approverUserId === input.actorUserId) {
        return { allowed: false, reason: 'SECOND_APPROVER_MUST_DIFFER' };
      }
    }

    return { allowed: true };
  }
}
