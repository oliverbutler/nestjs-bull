import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { queuePool } from 'src/bull-board-queue';

export type ClaimFormGenerationJobPayload = {
  claimId: string;
};

export type ClaimsSlackJobPayload = {
  claimId: string;
  type: 'PENDING_PARTNER_APPROVAL';
};

export type ClaimsEmailJobPayload = {
  claimId: string;
  type: 'MEMBER_DRAFT_SUBMISSION';
};

@Injectable()
export class EventsService {
  constructor(
    // @ts-expect-error type
    @InjectQueue('claims-form-generation')
    public readonly claimFormGeneration: Queue,
    // @ts-expect-error type
    @InjectQueue('claims-slack')
    public readonly claimsSlack: Queue,
    // @ts-expect-error type
    @InjectQueue('claims-email')
    public readonly claimsEmail: Queue,
  ) {
    queuePool.add(claimFormGeneration);
    queuePool.add(claimsSlack);
    queuePool.add(claimsEmail);
  }

  async generateClaimForm(payload: ClaimFormGenerationJobPayload) {
    await this.claimFormGeneration.add('generate', payload, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      timeout: 60 * 1000,
    });
  }

  async sendSlackNotification(payload: ClaimsSlackJobPayload) {
    await this.claimsSlack.add('send', payload, {
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async sendEmailNotification(payload: ClaimsEmailJobPayload) {
    await this.claimsEmail.add('send', payload, {
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
