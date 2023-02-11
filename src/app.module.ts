import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BullBoardController } from './bull-board.controller';
import { EventsService } from './events/events.service';
import { ClaimsFormGenerationProcessor } from './events/claims-form-generation.processor';
import { ClaimsNotificationProcessor } from './events/claims-notification.processor';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { QUEUES } from './queues';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ...Object.values(QUEUES).map(({ queueName: name }) =>
      BullModule.registerQueue({ name }),
    ),
  ],
  controllers: [AppController, BullBoardController],
  providers: [
    EventsService,
    ClaimsFormGenerationProcessor,
    ClaimsNotificationProcessor,
  ],
})
export class AppModule {}
