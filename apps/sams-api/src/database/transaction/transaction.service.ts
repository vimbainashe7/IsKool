import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ApplicationError } from '../../common/errors/application-error';

export type TransactionClient = Prisma.TransactionClient;

export interface DatabasePrincipal {
  userId: string;
  schoolId: string;
  membershipId: string;
  requestId?: string;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    return this.prisma.$transaction(callback, options);
  }

  async runWithPrincipal<T>(
    principal: DatabasePrincipal,
    callback: (tx: TransactionClient) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1]
  ): Promise<T> {
    try {
      return await this.run(async (tx) => {
        await tx.$executeRaw`
        SELECT
          set_config('iskool.user_id', ${principal.userId}, true),
          set_config('iskool.school_id', ${principal.schoolId}, true),
          set_config('iskool.membership_id', ${principal.membershipId}, true),
          set_config('iskool.request_id', ${principal.requestId ?? ''}, true)
      `;

        return callback(tx);
      }, options);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2028', 'P2024'].includes(error.code)
      ) {
        this.logger.warn(
          JSON.stringify({
            event: 'school_records_database_unavailable',
            code: error.code,
            requestId: principal.requestId
          })
        );
        throw new ApplicationError(
          'SCHOOL_RECORDS_UNAVAILABLE',
          'School records are temporarily busy. Reload before retrying changes.',
          503
        );
      }
      throw error;
    }
  }
}
