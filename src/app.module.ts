import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BullBoardController } from './bull-board.controller';
import { EventsService } from './events/events.service';
import { ClaimsSlackProcessor } from './events/claims-slack.processor';
import { ClaimsFormGenerationProcessor } from './events/claims-form-generation.processor';
import { ClaimsEmailProcessor } from './events/claims-email.processor';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { z } from 'zod';

type QueueShape = Record<
  string,
  {
    name: string;
    payload: z.ZodObject<{
      name: z.ZodLiteral<string>;
      data: z.AnyZodObject;
    }>;
  }
>;

const Queues = {
  CLAIMS_FORM_GENERATION: {
    name: 'claims-form-generation',
    payload: z.object({
      name: z.literal('generate'),
      data: z.object({
        claimId: z.string(),
      }),
    }),
  },
  CLAIMS_SLACK: {
    name: 'claims-slack',
    payload: z.object({
      name: z.literal('send'),
      data: z.object({
        claimId: z.string(),
        type: z.literal('PENDING_PARTNER_APPROVAL'),
      }),
    }),
  },
  CLAIMS_EMAIL: {
    name: 'claims-email',
    payload: z.object({
      name: z.literal('send'),
      data: z.object({
        claimId: z.string(),
        type: z.literal('MEMBER_DRAFT_SUBMISSION'),
      }),
    }),
  },
} satisfies QueueShape;

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
    ...Object.values(Queues).map(({ name }) =>
      BullModule.registerQueue({ name }),
    ),
  ],
  controllers: [AppController, BullBoardController],
  providers: [
    EventsService,
    ClaimsSlackProcessor,
    ClaimsFormGenerationProcessor,
    ClaimsEmailProcessor,
  ],
})
export class AppModule {}
