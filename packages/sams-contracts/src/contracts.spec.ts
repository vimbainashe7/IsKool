import { parseContext } from './index';
const schoolId = 'a1000000-0000-4000-8000-000000000001';
const membershipId = 'a3000000-0000-4000-8000-000000000004';
const context = {
  version: 1,
  schoolId,
  membershipId,
  role: 'student',
  asOf: new Date().toISOString(),
  student: null,
  classes: [],
  totalClasses: 0,
  nextCursor: null
};
describe('versioned school context boundary', () => {
  it('accepts a verified zero and strips unexpected provider fields', () => {
    expect(
      parseContext(
        { ...context, secret: 'must not forward' },
        schoolId,
        membershipId,
        'student'
      )
    ).toEqual(context);
  });
  it('rejects cross-school, cross-user and wrong-role responses', () => {
    for (const changed of [
      { schoolId: 'a1000000-0000-4000-8000-000000000002' },
      { membershipId: 'a3000000-0000-4000-8000-000000000003' },
      { role: 'teacher' }
    ])
      expect(() =>
        parseContext(
          { ...context, ...changed },
          schoolId,
          membershipId,
          'student'
        )
      ).toThrow();
  });
  it('rejects missing, malformed, excessive and unsupported version data', () => {
    for (const changed of [
      { classes: undefined },
      { totalClasses: -1 },
      { version: 2 },
      { classes: Array(101).fill({}) },
      { student: { id: 'wrong' } }
    ])
      expect(() =>
        parseContext(
          { ...context, ...changed },
          schoolId,
          membershipId,
          'student'
        )
      ).toThrow();
  });
});
