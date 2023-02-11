import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ClaimFormGenerationJobPayload, EventsService } from './events.service';

@Processor('claims-form-generation')
export class ClaimsFormGenerationProcessor {
  private readonly logger = new Logger(ClaimsFormGenerationProcessor.name);

  constructor(private readonly eventsService: EventsService) {}

  @Process({ name: '*', concurrency: 10 })
  async handleFormGeneration(job: Job<ClaimFormGenerationJobPayload>) {
    this.logger.debug(`Generating form for claim ${job.data.claimId}...`);

    for (let i = 0; i < 30; i++) {
      job.progress(i * 3.33);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.logger.debug(
      `Success generating form for claim ${job.data.claimId}...`,
    );

    await this.eventsService.sendEmailNotification({
      claimId: job.data.claimId,
      type: 'MEMBER_DRAFT_SUBMISSION',
    });

    await this.eventsService.sendSlackNotification({
      claimId: job.data.claimId,
      type: 'PENDING_PARTNER_APPROVAL',
    });
  }
}
