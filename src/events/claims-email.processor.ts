import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ClaimsEmailJobPayload } from './events.service';

@Processor('claims-email')
export class ClaimsEmailProcessor {
  private readonly logger = new Logger(ClaimsEmailProcessor.name);

  @Process('*')
  async handleEmailProcessor(job: Job<ClaimsEmailJobPayload>) {
    this.logger.debug(`Sending email ${job.data.claimId}...`);
  }
}
