import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { TypedJob, TypedProcessor } from 'src/queues';

@TypedProcessor('claimsNotification', {})
export class ClaimsNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(ClaimsNotificationProcessor.name);

  async process(job: TypedJob<'claimsNotification'>) {
    this.logger.debug(
      `Job ${job.name} started... with data ${JSON.stringify(job.data)}`,
    );

    if (job.name === 'send-email') {
      this.logger.debug(`Sending email to ${job.data.email}...`);
      this.logger.debug(`Success sending email to ${job.data.email}...`);
    } else {
      this.logger.debug(`Sending slack to ${job.data.channel}...`);
      this.logger.debug(`Success sending slack to ${job.data.channel}...`);
    }
  }
}
