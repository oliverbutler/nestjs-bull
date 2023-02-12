import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueProcessor, QueueService } from 'src/queues';

@QueueProcessor.claimsNotification()
export class ClaimsNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(ClaimsNotificationProcessor.name);

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: Job) {
    const { name, data } = this.queueService.parseJobPayload(
      job,
      'claimsNotification',
    );

    this.logger.debug(
      `Job ${name} started... with data ${JSON.stringify(data)}`,
    );

    if (name === 'send-email') {
      this.logger.debug(`Sending email to ${data.email}...`);
      this.logger.debug(`Success sending email to ${data.email}...`);
    } else {
      this.logger.debug(`Sending slack to ${data.channel}...`);
      this.logger.debug(`Success sending slack to ${data.channel}...`);
    }
  }
}
