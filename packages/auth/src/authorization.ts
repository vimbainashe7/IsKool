import { AuthPrincipal } from './principal';

export const authorizationActions = [
  'student.read',
  'student.update',
  'class.read',
  'assignment.create',
  'grade.write',
  'invoice.record-payment'
] as const;

export type AuthorizationAction = (typeof authorizationActions)[number];

export type PublicFailureMode = 'forbidden' | 'not_found';

export type AuthorizationDenyReason =
  | 'AUTHENTICATION_REQUIRED'
  | 'MEMBERSHIP_MISSING'
  | 'MEMBERSHIP_INACTIVE'
  | 'RESOURCE_SCHOOL_MISMATCH'
  | 'CAPABILITY_MISSING'
  | 'RESOURCE_OWNER_MISMATCH'
  | 'ENROLLMENT_MISMATCH'
  | 'CLASS_ASSIGNMENT_MISMATCH';

export type AuthorizationDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reason: AuthorizationDenyReason;
      readonly publicFailureMode: PublicFailureMode;
    };

export interface AuthorizationSubject {
  readonly principal?: AuthPrincipal;
  readonly membershipStatus: 'active' | 'inactive' | 'missing';
}

export interface AuthorizationResourceMetadata {
  readonly type: 'student' | 'class' | 'assignment' | 'grade' | 'invoice' | string;
  readonly id: string;
  readonly schoolId: string;
  readonly ownerUserId?: string;
}

export interface OwnershipMetadata {
  readonly ownerUserId?: string;
  readonly assignedTeacherUserId?: string;
  readonly enrolledStudentUserId?: string;
}

export interface ResourceSchoolResolver {
  resolveResourceSchool(resourceType: string, resourceId: string): Promise<string | null>;
}

export interface ResourceOwnershipResolver {
  resolveResourceOwnership(resourceType: string, resourceId: string): Promise<OwnershipMetadata | null>;
}

export interface ClassAccessResolver {
  resolveClassAccess(classId: string): Promise<{
    readonly schoolId: string;
    readonly assignedTeacherUserId?: string;
  } | null>;
}

export interface EnrollmentAccessResolver {
  resolveEnrollmentAccess(enrollmentId: string): Promise<{
    readonly schoolId: string;
    readonly studentUserId: string;
  } | null>;
}

export interface AuthorizeInput {
  readonly subject: AuthorizationSubject;
  readonly action: AuthorizationAction;
  readonly resource: AuthorizationResourceMetadata;
  readonly ownership?: OwnershipMetadata;
  readonly publicFailureMode?: PublicFailureMode;
  readonly clientClaims?: Record<string, unknown>;
}

const roleCapabilities: Readonly<Record<string, readonly AuthorizationAction[]>> = {
  admin: authorizationActions,
  leadership: ['student.read', 'class.read', 'assignment.create', 'grade.write'],
  registrar: ['student.read', 'student.update', 'class.read'],
  teacher: ['student.read', 'class.read', 'assignment.create'],
  student: ['student.read', 'class.read'],
  finance: ['invoice.record-payment'],
  hr: []
};

const ownerScopedActions = new Set<AuthorizationAction>(['student.read', 'student.update', 'class.read', 'grade.write']);

export class AuthorizationKernel {
  authorize(input: AuthorizeInput): AuthorizationDecision {
    const failureMode = input.publicFailureMode ?? 'forbidden';
    const principal = input.subject.principal;

    if (!principal) {
      return deny('AUTHENTICATION_REQUIRED', 'forbidden');
    }

    if (input.subject.membershipStatus === 'missing') {
      return deny('MEMBERSHIP_MISSING', 'forbidden');
    }

    if (input.subject.membershipStatus !== 'active') {
      return deny('MEMBERSHIP_INACTIVE', 'forbidden');
    }

    if (input.resource.schoolId !== principal.schoolId) {
      return deny('RESOURCE_SCHOOL_MISMATCH', 'not_found');
    }

    if (!this.hasCapability(principal.roles, input.action)) {
      return deny('CAPABILITY_MISSING', 'forbidden');
    }

    if (ownerScopedActions.has(input.action)) {
      const ownership = input.ownership ?? input.resource;
      if (!matchesOwnership(principal, ownership)) {
        return deny('RESOURCE_OWNER_MISMATCH', failureMode);
      }
    }

    return { allowed: true };
  }

  hasCapability(roles: readonly string[], action: AuthorizationAction): boolean {
    return roles.some((role) => roleCapabilities[role]?.includes(action));
  }
}

export interface AuthorizationLogInput {
  readonly requestId: string;
  readonly subject: AuthorizationSubject;
  readonly action: AuthorizationAction;
  readonly resource: AuthorizationResourceMetadata;
  readonly decision: AuthorizationDecision;
}

export interface AuthorizationDeniedLogEvent {
  readonly event: 'authorization_denied';
  readonly requestId: string;
  readonly actorUserId?: string;
  readonly schoolId?: string;
  readonly membershipId?: string;
  readonly action: AuthorizationAction;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly reason: AuthorizationDenyReason;
  readonly publicFailureMode: PublicFailureMode;
}

export function createAuthorizationLogEvent(input: AuthorizationLogInput): AuthorizationDeniedLogEvent | null {
  if (input.decision.allowed) {
    return null;
  }

  return {
    event: 'authorization_denied',
    requestId: input.requestId,
    actorUserId: input.subject.principal?.userId,
    schoolId: input.subject.principal?.schoolId,
    membershipId: input.subject.principal?.membershipId,
    action: input.action,
    resourceType: input.resource.type,
    resourceId: input.resource.id,
    reason: input.decision.reason,
    publicFailureMode: input.decision.publicFailureMode
  };
}

function deny(reason: AuthorizationDenyReason, publicFailureMode: PublicFailureMode): AuthorizationDecision {
  return { allowed: false, reason, publicFailureMode };
}

function matchesOwnership(principal: AuthPrincipal, ownership: OwnershipMetadata): boolean {
  if (ownership.ownerUserId && ownership.ownerUserId !== principal.userId) {
    return false;
  }
  if (ownership.assignedTeacherUserId && ownership.assignedTeacherUserId !== principal.userId) {
    return false;
  }
  if (ownership.enrolledStudentUserId && ownership.enrolledStudentUserId !== principal.userId) {
    return false;
  }
  return true;
}
