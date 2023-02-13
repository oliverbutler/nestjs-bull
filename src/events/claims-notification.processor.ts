import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { QueueService } from 'src/queues';

@Injectable()
export class ClaimsNotificationProcessor {
  private readonly logger = new Logger(ClaimsNotificationProcessor.name);

  constructor(private readonly queueService: QueueService) {}

  @SqsMessageHandler('claims-notification')
  async process(job: AWS.SQS.Message) {
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
