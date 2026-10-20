import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import {
  TransactionService,
  TransactionClient
} from '../../database/transaction/transaction.service';
import { ResourceNotFoundError } from '../../common/errors/application-error';
type Snapshot = {
  school: {
    id: string;
    name: string;
    logoPresent: boolean;
    brandingVersion: number;
  };
  user: { id: string; displayName: string; profileVersion: number };
};
@Injectable()
export class SettingsRepository {
  constructor(private readonly transactions: TransactionService) {}
  run<T>(
    p: AuthPrincipal,
    requestId: string,
    work: (tx: TransactionClient) => Promise<T>
  ) {
    return this.transactions.runWithPrincipal({ ...p, requestId }, work);
  }
  async read(tx: TransactionClient, p: AuthPrincipal) {
    // One bounded snapshot avoids separate identity round trips to the hosted
    // development pooler. Both tables retain their existing runtime RLS.
    const [row] = await tx.$queryRaw<Snapshot[]>`SELECT
      jsonb_build_object('id',s.id,'name',s.name,'logoPresent',s.logo_present,'brandingVersion',s.branding_version) AS school,
      jsonb_build_object('id',u.id,'displayName',u.display_name,'profileVersion',u.profile_version) AS "user"
      FROM public.schools s CROSS JOIN public.users u WHERE s.id=${p.schoolId}::uuid AND u.id=${p.userId}::uuid`;
    if (!row)
      throw new ResourceNotFoundError(
        'Settings are not available for your active school.'
      );
    return row;
  }
}
