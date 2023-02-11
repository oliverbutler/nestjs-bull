import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { Queues } from 'src/queues';
import { queuePool } from 'src/bull-board-queue';

@Injectable()
export class EventsService {
  constructor(
    @InjectQueue('claims-form-generation')
    public readonly claimFormGeneration: Queue,
    @InjectQueue('claims-notification')
    public readonly claimsNotification: Queue,
  ) {
    queuePool.add(claimFormGeneration);
    queuePool.add(claimsNotification);
  }

  async generateClaimForm({
    name,
    data,
  }: Queues['CLAIMS_FORM_GENERATION']['payload']) {
    await this.claimFormGeneration.add(name, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      timeout: 60 * 1000,
    });
  }

  async sendNotification({
    name,
    data,
  }: Queues['CLAIMS_NOTIFICATION']['payload']) {
    await this.claimsNotification.add(name, data, {
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
