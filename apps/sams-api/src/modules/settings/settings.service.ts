import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import {
  ConflictError,
  BusinessRuleError,
  PermissionDeniedError
} from '../../common/errors/application-error';
import { AuditService } from '../audit/audit.service';
import { SettingsRepository } from './settings.repository';
import { OwnProfileDto, SchoolNameDto, SaveSettingsDto } from './settings.dto';
import { canonicalLogo } from './logo';
export function assertSettingsAdmin(p: AuthPrincipal) {
  if (p.scope !== 'sams' || !p.roles.includes('admin'))
    throw new PermissionDeniedError(
      'Only your school Admin can change school settings.'
    );
}
@Injectable()
export class SettingsService {
  constructor(
    private readonly records: SettingsRepository,
    private readonly audit: AuditService
  ) {}
  read(p: AuthPrincipal, r: string) {
    assertSettingsAdmin(p);
    return this.records.run(p, r, (tx) => this.records.read(tx, p));
  }
  async saveAll(
    p: AuthPrincipal,
    r: string,
    dto: SaveSettingsDto,
    input?: Buffer
  ) {
    assertSettingsAdmin(p);
    if ((dto.logoAction === 'replace') !== Boolean(input?.length))
      throw new BusinessRuleError(
        'LOGO_REQUIRED',
        'Choose a logo only when replacing the school logo.'
      );
    const logoDataUrl = input ? await canonicalLogo(input) : undefined;
    return this.records.run(p, r, async (tx) => {
      const before = await this.records.read(tx, p);
      const conflict = () =>
        new ConflictError(
          'These settings changed since you opened them. Reload before saving.'
        );
      if (
        before.school.brandingVersion !== dto.schoolVersion ||
        before.user.profileVersion !== dto.profileVersion
      )
        throw conflict();
      const schoolChanged =
        before.school.name !== dto.name ||
        dto.logoAction === 'replace' ||
        (dto.logoAction === 'remove' && before.school.logoPresent);
      const profileChanged = before.user.displayName !== dto.displayName;
      if (!schoolChanged && !profileChanged) return before;
      if (schoolChanged) {
        const changed = await tx.school.updateMany({
          where: { id: p.schoolId, brandingVersion: dto.schoolVersion },
          data: {
            name: dto.name,
            brandingVersion: { increment: 1 },
            ...(dto.logoAction === 'replace'
              ? { logoDataUrl, logoPresent: true }
              : dto.logoAction === 'remove'
                ? { logoDataUrl: null, logoPresent: false }
                : {})
          }
        });
        if (changed.count !== 1) throw conflict();
      }
      if (profileChanged) {
        const changed = await tx.user.updateMany({
          where: { id: p.userId, profileVersion: dto.profileVersion },
          data: {
            displayName: dto.displayName,
            profileVersion: { increment: 1 }
          }
        });
        if (changed.count !== 1) throw conflict();
      }
      const after = await this.records.read(tx, p);
      for (const profile of [false, true]) {
        if (profile ? !profileChanged : !schoolChanged) continue;
        await this.audit.record(tx, {
          actorUserId: p.userId,
          actorMembershipId: p.membershipId,
          schoolId: p.schoolId,
          requestId: r,
          action: profile
            ? 'profile.display_name_updated'
            : 'school.settings_updated',
          entityType: profile ? 'user' : 'school',
          entityId: profile ? p.userId : p.schoolId,
          beforeValue: profile ? before.user : before.school,
          afterValue: profile ? after.user : after.school
        });
      }
      return after;
    });
  }
  private async update(
    p: AuthPrincipal,
    r: string,
    version: number,
    fields:
      | { name?: string; logoDataUrl?: string | null; logoPresent?: boolean }
      | { displayName: string },
    profile: boolean,
    action: string
  ) {
    assertSettingsAdmin(p);
    return this.records.run(p, r, async (tx) => {
      const before = await this.records.read(tx, p);
      const changed = profile
        ? await tx.user.updateMany({
            where: { id: p.userId, profileVersion: version },
            data: { ...fields, profileVersion: { increment: 1 } }
          })
        : await tx.school.updateMany({
            where: { id: p.schoolId, brandingVersion: version },
            data: { ...fields, brandingVersion: { increment: 1 } }
          });
      if (changed.count !== 1)
        throw new ConflictError(
          'These settings changed since you opened them. Reload before saving.'
        );
      const after = await this.records.read(tx, p);
      await this.audit.record(tx, {
        actorUserId: p.userId,
        actorMembershipId: p.membershipId,
        schoolId: p.schoolId,
        requestId: r,
        action,
        entityType: profile ? 'user' : 'school',
        entityId: profile ? p.userId : p.schoolId,
        beforeValue: profile ? before.user : before.school,
        afterValue: profile ? after.user : after.school
      });
      return after;
    });
  }
  rename(p: AuthPrincipal, r: string, dto: SchoolNameDto) {
    return this.update(
      p,
      r,
      dto.version,
      { name: dto.name },
      false,
      'school.name_updated'
    );
  }
  profile(p: AuthPrincipal, r: string, dto: OwnProfileDto) {
    return this.update(
      p,
      r,
      dto.version,
      { displayName: dto.displayName },
      true,
      'profile.display_name_updated'
    );
  }
  async logo(p: AuthPrincipal, r: string, version: number, input: Buffer) {
    assertSettingsAdmin(p);
    const logoDataUrl = await canonicalLogo(input);
    return this.update(
      p,
      r,
      version,
      { logoDataUrl, logoPresent: true },
      false,
      'school.logo_updated'
    );
  }
  removeLogo(p: AuthPrincipal, r: string, version: number) {
    return this.update(
      p,
      r,
      version,
      { logoDataUrl: null, logoPresent: false },
      false,
      'school.logo_removed'
    );
  }
}
