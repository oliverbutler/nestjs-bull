import { z, ZodError } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';

/**
 * Fully typed queues, broken down by queue name, then the job name, then the jobs payload.
 */
type QueueShape = Record<
  string,
  {
    queueName: string;
    payload: z.ZodDiscriminatedUnion<
      'name',
      Array<
        z.ZodObject<{
          name: z.ZodLiteral<string>;
          data: z.AnyZodObject;
        }>
      >
    >;
  }
>;

export const QUEUES = {
  claimsFormGeneration: {
    queueName: 'claims-form-generation',
    payload: z.discriminatedUnion('name', [
      z.object({
        name: z.literal('generate'),
        data: z.object({
          claimId: z.string(),
        }),
      }),
    ]),
  },
  claimsNotification: {
    queueName: 'claims-notification',
    payload: z.discriminatedUnion('name', [
      z.object({
        name: z.literal('send-slack'),
        data: z.object({
          claimId: z.string(),
          channel: z.string(),
          type: z.literal('PENDING_PARTNER_APPROVAL'),
          transformToNumber: z.coerce.number(),
        }),
      }),
      z.object({
        name: z.literal('send-email'),
        data: z.object({
          claimId: z.string(),
          email: z.string(),
          type: z.literal('MEMBER_DRAFT_SUBMISSION'),
        }),
      }),
    ]),
  },
} satisfies QueueShape;

export type Queues = {
  [K in keyof typeof QUEUES]: {
    queueName: typeof QUEUES[K]['queueName'];
    payload: z.input<typeof QUEUES[K]['payload']>;
  };
};

type RecursiveQueueClient = {
  [key in keyof Queues]: {
    add: <TName extends Queues[key]['payload']['name']>(
      name: TName,
      data: (Queues[key]['payload'] & { name: TName })['data'],
    ) => Promise<void>;
  };
};

@Injectable()
export class QueueService {
  public queue = {} as RecursiveQueueClient;

  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly sqsService: SqsService) {
    /**
     * Generate the queue client, which is a recursive object that lets you type the queue name and the job name, for better queue DX.
     */
    this.queue = Object.keys(QUEUES).reduce((acc, key) => {
      acc[key] = {
        add: async (name: string, data: any) => {
          const queue = QUEUES[key];

          await this.sqsService.send(queue.queueName, {
            id: '123',
            body: {
              name,
              data,
            },
          });
        },
      };
      return acc;
    }, {} as RecursiveQueueClient);
  }

  parseJobPayload<TName extends keyof Queues>(
    message: AWS.SQS.Message,
    name: TName,
  ): z.infer<typeof QUEUES[TName]['payload']> {
    try {
      const payloadToTest = JSON.parse(message.Body || '{}');

      const payload = QUEUES[name].payload.parse(payloadToTest);

      return payload;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(
          `Job ${message.MessageId}  failed to parse payload: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Job ${message.MessageId}  failed for unknown reason`,
        );
      }
      throw error;
    }
  }
}
