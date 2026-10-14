import { AuthorizationKernel } from '../../packages/auth/dist/index.js';

const kernel = new AuthorizationKernel();
const principal = {
  userId: 'user-alpha',
  schoolId: 'school-alpha',
  membershipId: 'membership-alpha',
  sessionId: 'session-alpha',
  scope: 'sams',
  roles: ['registrar'],
  tokenId: 'token-alpha'
};
const resource = { type: 'student', id: 'student-alpha', schoolId: 'school-alpha', ownerUserId: 'user-alpha' };

function assertDecision(label, decision, allowed, reason) {
  if (decision.allowed !== allowed || (!allowed && decision.reason !== reason)) {
    throw new Error(`${label}: unexpected decision ${JSON.stringify(decision)}`);
  }
  console.log(`PASS ${label}`);
}

assertDecision(
  'active membership allowed',
  kernel.authorize({
    subject: { principal, membershipStatus: 'active' },
    action: 'student.update',
    resource
  }),
  true
);

assertDecision(
  'inactive membership denied',
  kernel.authorize({
    subject: { principal, membershipStatus: 'inactive' },
    action: 'student.update',
    resource
  }),
  false,
  'MEMBERSHIP_INACTIVE'
);

assertDecision(
  'wrong school denied',
  kernel.authorize({
    subject: { principal, membershipStatus: 'active' },
    action: 'student.update',
    resource: { ...resource, schoolId: 'school-beta' }
  }),
  false,
  'RESOURCE_SCHOOL_MISMATCH'
);

assertDecision(
  'forged school context denied',
  kernel.authorize({
    subject: { principal: { ...principal, schoolId: 'school-beta' }, membershipStatus: 'active' },
    action: 'student.update',
    resource
  }),
  false,
  'RESOURCE_SCHOOL_MISMATCH'
);

assertDecision(
  'wrong role denied',
  kernel.authorize({
    subject: { principal: { ...principal, roles: ['student'] }, membershipStatus: 'active' },
    action: 'invoice.record-payment',
    resource: { type: 'invoice', id: 'invoice-alpha', schoolId: 'school-alpha' }
  }),
  false,
  'CAPABILITY_MISSING'
);

console.log('NOTE teacher/class and student-record ownership adapters require VIM-51/VIM-53 domain resources.');
