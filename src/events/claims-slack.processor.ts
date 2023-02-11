import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ClaimsSlackJobPayload } from './events.service';

@Processor('claims-slack')
export class ClaimsSlackProcessor {
  private readonly logger = new Logger(ClaimsSlackProcessor.name);

  @Process('*')
  async handleSlackJob(job: Job<ClaimsSlackJobPayload>) {
    this.logger.debug(`Sending slack for claim ${job.data.claimId}...`);
  }
}
