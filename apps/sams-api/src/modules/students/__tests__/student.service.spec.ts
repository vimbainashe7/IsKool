import { AuthPrincipal } from '@aps-sams/auth';
import { StudentService } from '../student.service';
import { StudentRepository } from '../student.repository';
import { AuditService } from '../../audit/audit.service';
const p: AuthPrincipal = { userId: 'actor', schoolId: 'school-a', membershipId: 'member', sessionId: 'session', scope: 'sams', roles: ['registrar'], tokenId: 'token' };
function setup() {
  const tx = { $queryRaw: jest.fn().mockResolvedValue([]), student: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() }, enrollment: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() }, schoolClass: { findFirst: jest.fn() }, academicTerm: { findFirst: jest.fn() }, guardian: { findFirst: jest.fn() }, studentGuardian: { create: jest.fn() } };
  const repo = { run: jest.fn(async (_p, _r, work) => work(tx)), detail: jest.fn(), list: jest.fn(), summary: jest.fn(), enrollments: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return { tx, repo, audit, service: new StudentService(repo as unknown as StudentRepository, audit as unknown as AuditService) };
}
describe('student service invariants', () => {
  it('denies student and teacher summary access before querying records', () => {
    const {service,repo} = setup();
    for (const role of ['student','teacher']) expect(() => service.summary({...p,roles:[role]},'r')).toThrow('Permission denied');
    expect(repo.run).not.toHaveBeenCalled();
  });
  it('scopes summary and paginated enrollment reads to the authenticated school', async () => {
    const {service,repo} = setup();
    repo.summary.mockResolvedValue({students:2,activeStudents:2,enrolledStudents:1,activeEnrollments:2,classes:2,withoutClass:1});
    expect(await service.summary(p,'r')).toEqual(expect.objectContaining({enrolledStudents:1,activeEnrollments:2}));
    expect(repo.summary).toHaveBeenCalledWith(expect.anything(),p.schoolId);
    repo.enrollments.mockResolvedValue([{id:'a'},{id:'b'},{id:'c'}]);
    expect(await service.enrollments(p,'r',{limit:2})).toEqual({items:[{id:'a'},{id:'b'}],nextCursor:'b'});
    expect(repo.enrollments).toHaveBeenCalledWith(expect.anything(),p.schoolId,2,undefined);
  });
  it('uses the authenticated school and writes audit in the same transaction', async () => {
    const {tx, service, audit} = setup();
    tx.student.create.mockResolvedValue({id:'student',schoolId:p.schoolId});
    await service.create(p,'request',{admissionNumber:'A-1',givenName:'Alpha',familyName:'Learner'});
    expect(tx.student.create).toHaveBeenCalledWith({data:expect.objectContaining({schoolId:p.schoolId})});
    expect(audit.record).toHaveBeenCalledWith(tx,expect.objectContaining({actorUserId:p.userId,schoolId:p.schoolId,requestId:'request',action:'student.created'}));
  });
  it('propagates audit failure so the repository transaction rolls back', async () => {
    const {tx, service, audit}=setup(); tx.student.create.mockResolvedValue({id:'student'}); audit.record.mockRejectedValue(new Error('audit unavailable'));
    await expect(service.create(p,'request',{admissionNumber:'A-1',givenName:'Alpha',familyName:'Learner'})).rejects.toThrow('audit unavailable');
  });
  it('denies teachers before any database transaction', async () => {
    const {service,repo}=setup();
    expect(()=>service.create({...p,roles:['teacher']},'request',{admissionNumber:'A-1',givenName:'Alpha',familyName:'Learner'})).toThrow('Permission denied');
    expect(repo.run).not.toHaveBeenCalled();
  });
  it('returns not found for another school student and never writes', async () => {
    const {service,tx}=setup(); tx.student.findFirst.mockResolvedValue(null);
    await expect(service.update(p,'request','foreign',{version:1,givenName:'X'})).rejects.toThrow('Student not found');
    expect(tx.student.findFirst).toHaveBeenCalledWith({where:{id:'foreign',schoolId:p.schoolId}});
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });
  it('prevents archival with open enrollments', async () => {
    const {service,tx}=setup(); tx.student.findFirst.mockResolvedValue({id:'student'}); tx.enrollment.count.mockResolvedValue(1);
    await expect(service.update(p,'request','student',{version:1,status:'archived'})).rejects.toThrow('Close the student');
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });
  it('rejects stale student versions without recording success', async () => {
    const {service,tx,audit}=setup(); tx.student.findFirst.mockResolvedValue({id:'student'}); tx.student.updateMany.mockResolvedValue({count:0});
    await expect(service.update(p,'request','student',{version:1,givenName:'Changed'})).rejects.toThrow('Reload before saving');
    expect(audit.record).not.toHaveBeenCalled();
  });
  it('does not link an inaccessible guardian', async () => {
    const {service,tx}=setup();tx.student.findFirst.mockResolvedValue({id:'student'});tx.guardian.findFirst.mockResolvedValue(null);
    await expect(service.linkGuardian(p,'request','student',{guardianId:'foreign',relationship:'guardian'})).rejects.toThrow('not found in your school');
    expect(tx.studentGuardian.create).not.toHaveBeenCalled();
  });
  it('rejects a class and term from different academic years', async () => {
    const {service,tx}=setup();tx.student.findFirst.mockResolvedValue({id:'student'});tx.schoolClass.findFirst.mockResolvedValue({academicYearId:'year-a'});tx.academicTerm.findFirst.mockResolvedValue({academicYearId:'year-b'});
    await expect(service.enroll(p,'request','student',{classId:'class',academicTermId:'term',status:'active'})).rejects.toThrow('same academic year');
    expect(tx.enrollment.create).not.toHaveBeenCalled();
  });
  it('does not revive withdrawn enrollment records', async () => {
    const {service,tx}=setup();tx.enrollment.findFirst.mockResolvedValue({status:'withdrawn'});
    await expect(service.changeEnrollment(p,'request','enrollment',{version:1,status:'active'})).rejects.toThrow('Enrollment status cannot change');
    expect(tx.enrollment.updateMany).not.toHaveBeenCalled();
  });
});
