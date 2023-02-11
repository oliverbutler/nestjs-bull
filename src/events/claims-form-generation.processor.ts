import { Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import { TypedJob, TypedProcess, TypedProcessor } from 'src/queues';

@TypedProcessor('CLAIMS_FORM_GENERATION')
export class ClaimsFormGenerationProcessor {
  private readonly logger = new Logger(ClaimsFormGenerationProcessor.name);

  constructor(private readonly eventsService: EventsService) {}

  @TypedProcess('CLAIMS_FORM_GENERATION', '*', { concurrency: 10 })
  async handleFormGeneration(job: TypedJob<'CLAIMS_FORM_GENERATION'>) {
    this.logger.debug(`Generating form for claim ${job.data.claimId}...`);

    this.logger.debug(
      `Success generating form for claim ${job.data.claimId}...`,
    );

    await this.eventsService.sendNotification({
      name: 'send-slack',
      data: {
        type: 'PENDING_PARTNER_APPROVAL',
        channel: 'test-channel',
        claimId: job.data.claimId,
      },
    });

    await this.eventsService.sendNotification({
      name: 'send-email',
      data: {
        type: 'MEMBER_DRAFT_SUBMISSION',
        email: 'test@gmail.com',
        claimId: job.data.claimId,
      },
    });
  }
}
