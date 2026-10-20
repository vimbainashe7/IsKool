import { Prisma } from '@prisma/client';
import { AuthPrincipal } from '@aps-sams/auth';
import { SettingsService } from '../settings.service';
import { SettingsRepository } from '../settings.repository';
import { AuditService } from '../../audit/audit.service';
const p: AuthPrincipal = {
  userId: 'own-user',
  membershipId: 'own-member',
  schoolId: 'own-school',
  sessionId: 'session',
  scope: 'sams',
  tokenId: 'token',
  roles: ['admin']
};
function setup() {
  const state = {
    school: {
      id: p.schoolId,
      name: 'School',
      brandingVersion: 1,
      logoPresent: false
    },
    user: { id: p.userId, displayName: 'Admin', profileVersion: 1 }
  };
  const tx = {
    school: {
      update: jest
        .fn()
        .mockResolvedValue({
          ...state.school,
          name: 'New school',
          brandingVersion: 2
        }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    user: {
      update: jest
        .fn()
        .mockResolvedValue({
          ...state.user,
          displayName: 'New admin',
          profileVersion: 2
        }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    }
  };
  const repo = {
    run: jest.fn(async (_p, _r, work) => work(tx)),
    read: jest.fn().mockResolvedValue(state)
  };
  const audit = {
    record: jest.fn().mockResolvedValue(undefined),
    recordMany: jest.fn().mockResolvedValue(undefined)
  };
  return {
    state,
    tx,
    repo,
    audit,
    service: new SettingsService(
      repo as unknown as SettingsRepository,
      audit as unknown as AuditService
    )
  };
}
describe('current-school settings invariants', () => {
  const combined = {
    name: 'New school',
    displayName: 'New admin',
    schoolVersion: 1,
    profileVersion: 1,
    logoAction: 'keep' as const
  };
  it('saves school and own profile in one transaction and audits both entities', async () => {
    const { service, repo, tx, audit } = setup();
    await service.saveAll(p, 'request', combined);
    expect(repo.run).toHaveBeenCalledTimes(1);
    expect(tx.school.update).toHaveBeenCalledWith({
      where: { id: p.schoolId, brandingVersion: 1 },
      data: { name: 'New school', brandingVersion: { increment: 1 } },
      select: { id: true, name: true, logoPresent: true, brandingVersion: true }
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: p.userId, profileVersion: 1 },
      data: { displayName: 'New admin', profileVersion: { increment: 1 } },
      select: { id: true, displayName: true, profileVersion: true }
    });
    expect(audit.recordMany).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale profile before changing school data', async () => {
    const { service, tx, audit } = setup();
    await expect(
      service.saveAll(p, 'r', { ...combined, profileVersion: 2 })
    ).rejects.toThrow('Reload');
    expect(tx.school.update).not.toHaveBeenCalled();
    expect(audit.recordMany).not.toHaveBeenCalled();
  });
  it('rejects the entire transaction if the profile conflicts after the school update', async () => {
    const { service, tx, audit } = setup();
    tx.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2025',
        clientVersion: '5'
      })
    );
    await expect(service.saveAll(p, 'r', combined)).rejects.toThrow('Reload');
    expect(audit.recordMany).not.toHaveBeenCalled();
  });
  it('does not write or audit when nothing changed', async () => {
    const { service, tx, audit } = setup();
    await service.saveAll(p, 'r', {
      ...combined,
      name: 'School',
      displayName: 'Admin'
    });
    expect(tx.school.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(audit.recordMany).not.toHaveBeenCalled();
  });
  it('denies combined writes and invalid logo intent before starting a transaction', async () => {
    const { service, repo } = setup();
    await expect(
      service.saveAll({ ...p, roles: ['teacher'] }, 'r', combined)
    ).rejects.toThrow('Admin');
    await expect(
      service.saveAll(p, 'r', { ...combined, logoAction: 'replace' })
    ).rejects.toThrow('logo');
    await expect(
      service.saveAll(p, 'r', combined, Buffer.from('bad'))
    ).rejects.toThrow('logo');
    expect(repo.run).not.toHaveBeenCalled();
  });
  it('denies non-Admin and wrong-scope writes before transaction or image decoding', async () => {
    const { service, repo } = setup();
    for (const roles of [['teacher'], ['student'], ['registrar']])
      await expect(
        service.rename({ ...p, roles }, 'r', { name: 'Denied', version: 1 })
      ).rejects.toThrow('Admin');
    await expect(
      service.profile({ ...p, scope: 'aps' }, 'r', {
        displayName: 'Denied',
        version: 1
      })
    ).rejects.toThrow('Admin');
    await expect(
      service.logo({ ...p, roles: ['registrar'] }, 'r', 1, Buffer.from('bad'))
    ).rejects.toThrow('Admin');
    expect(repo.run).not.toHaveBeenCalled();
  });
  it('updates only the principal school with optimistic version and an atomic audit event', async () => {
    const { service, tx, audit } = setup();
    await service.rename(p, 'request', { name: 'Renamed', version: 3 });
    expect(tx.school.updateMany).toHaveBeenCalledWith({
      where: { id: p.schoolId, brandingVersion: 3 },
      data: { name: 'Renamed', brandingVersion: { increment: 1 } }
    });
    expect(audit.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityId: p.schoolId,
        requestId: 'request',
        action: 'school.name_updated'
      })
    );
  });
  it('updates only the signed-in user and never permissions or another profile', async () => {
    const { service, tx } = setup();
    await service.profile(p, 'r', { displayName: 'My name', version: 1 });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: p.userId, profileVersion: 1 },
      data: { displayName: 'My name', profileVersion: { increment: 1 } }
    });
    expect(tx.school.updateMany).not.toHaveBeenCalled();
  });
  it('rejects concurrent edits without a success audit', async () => {
    const { service, tx, audit } = setup();
    tx.school.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.rename(p, 'r', { name: 'Stale', version: 1 })
    ).rejects.toThrow('Reload');
    expect(audit.record).not.toHaveBeenCalled();
  });
  it('removes only the school logo and propagates audit failure for rollback', async () => {
    const { service, tx, audit } = setup();
    audit.record.mockRejectedValue(new Error('audit unavailable'));
    await expect(service.removeLogo(p, 'r', 4)).rejects.toThrow(
      'audit unavailable'
    );
    expect(tx.school.updateMany).toHaveBeenCalledWith({
      where: { id: p.schoolId, brandingVersion: 4 },
      data: {
        logoDataUrl: null,
        logoPresent: false,
        brandingVersion: { increment: 1 }
      }
    });
  });
});
