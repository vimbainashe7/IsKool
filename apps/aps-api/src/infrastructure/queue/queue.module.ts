import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUES, defaultJobOptions } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
          password: config.get<string>('redis.password')
        },
        defaultJobOptions
      })
    }),
    BullModule.registerQueue(
      { name: QUEUES.apsAiNotes, defaultJobOptions },
      { name: QUEUES.apsAiExams, defaultJobOptions },
      { name: QUEUES.samsPdfReports, defaultJobOptions },
      { name: QUEUES.notifications, defaultJobOptions }
    )
  ],
  exports: [BullModule]
})
export class QueueModule {}
