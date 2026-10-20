import { AuthPrincipal } from '@aps-sams/auth';
import { BusinessRuleError, PermissionDeniedError } from '../../common/errors/application-error';

export function assertStudentAdministrator(principal: AuthPrincipal): void {
  if (principal.scope !== 'sams' || !principal.roles.some(role => role === 'admin' || role === 'registrar')) {
    throw new PermissionDeniedError();
  }
}

export const enrollmentTransitions: Readonly<Record<string, readonly string[]>> = {
  pending: ['active', 'cancelled'],
  active: ['withdrawn', 'transferred', 'completed']
};

export function assertEnrollmentTransition(from: string, to: string): void {
  if (!enrollmentTransitions[from]?.includes(to)) {
    throw new BusinessRuleError('INVALID_ENROLLMENT_TRANSITION', 'Enrollment status cannot change through this transition. Create a new enrollment for reentry.');
  }
}
