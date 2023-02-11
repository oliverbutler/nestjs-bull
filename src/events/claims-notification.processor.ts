import { Logger } from '@nestjs/common';
import { TypedJob, TypedProcess, TypedProcessor } from 'src/queues';

@TypedProcessor('CLAIMS_NOTIFICATION')
export class ClaimsNotificationProcessor {
  private readonly logger = new Logger(ClaimsNotificationProcessor.name);

  @TypedProcess('CLAIMS_NOTIFICATION', '*')
  async handleNotification(job: TypedJob<'CLAIMS_NOTIFICATION', '*'>) {
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
