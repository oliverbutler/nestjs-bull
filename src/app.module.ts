import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ClaimsFormGenerationProcessor } from './events/claims-form-generation.processor';
import { ClaimsNotificationProcessor } from './events/claims-notification.processor';
import { QueueService } from './queues';
import { SqsModule } from '@ssut/nestjs-sqs';
import * as AWS from 'aws-sdk';

const sqs = new AWS.SQS({
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
});

@Module({
  imports: [
    SqsModule.register({
      consumers: [
        {
          name: 'claims-notification',
          queueUrl: 'http://localhost:4566/000000000000/claims-notification',
          sqs,
        },
        {
          name: 'claims-form-generation',
          queueUrl: 'http://localhost:4566/000000000000/claims-form-generation',
          sqs,
        },
      ],
      producers: [
        {
          name: 'claims-notification',
          queueUrl: 'http://localhost:4566/000000000000/claims-notification',
          sqs,
        },
        {
          name: 'claims-form-generation',
          queueUrl: 'http://localhost:4566/000000000000/claims-form-generation',
          sqs,
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    QueueService,
    ClaimsFormGenerationProcessor,
    ClaimsNotificationProcessor,
  ],
})
export class AppModule {}
