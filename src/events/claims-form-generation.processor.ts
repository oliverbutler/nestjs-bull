import { Logger } from '@nestjs/common';
import { QueueService, TypedJob, TypedProcessor } from 'src/queues';
import { WorkerHost } from '@nestjs/bullmq';

@TypedProcessor('claimsFormGeneration', { concurrency: 10 })
export class ClaimsFormGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ClaimsFormGenerationProcessor.name);

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: TypedJob<'claimsFormGeneration'>) {
    this.logger.debug(`Generating form for claim ${job.data.claimId}...`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.debug(
      `Success generating form for claim ${job.data.claimId}...`,
    );

    await this.queueService.queue.claimsNotification.add('send-slack', {
      type: 'PENDING_PARTNER_APPROVAL',
      channel: 'test-channel',
      claimId: job.data.claimId,
    });

    await this.queueService.queue.claimsNotification.add('send-email', {
      type: 'MEMBER_DRAFT_SUBMISSION',
      email: 'test@gmail.com',
      claimId: job.data.claimId,
    });
  }
}
