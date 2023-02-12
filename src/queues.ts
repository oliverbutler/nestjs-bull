import { BullModule, Processor, ProcessorOptions } from '@nestjs/bullmq';
import { WorkerOptions, Job } from 'bullmq';
import { z } from 'zod';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

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
    queueName: (typeof QUEUES)[K]['queueName'];
    payload: z.infer<(typeof QUEUES)[K]['payload']>;
  };
};

/**
 * Helper to let you type a job fully, including the queue name and the job name.
 */
export type TypedJob<T extends keyof Queues> = Job<
  Queues[T]['payload']['data']
> &
  Queues[T]['payload'];

export type TypedProcessPayload<T extends keyof Queues> = Queues[T]['payload'];

export const TypedProcessor = (
  queue: keyof Queues,
  workerOptions: WorkerOptions,
  options?: Omit<ProcessorOptions, 'name'>,
) => {
  return Processor(
    { name: QUEUES[queue].queueName, ...options },
    workerOptions,
  );
};

type QueuesWithBullMQ = {
  [key in keyof Queues]: Queue<Queues[key]['payload']['data'], unknown>;
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
  private QUEUE_POOL = {} as QueuesWithBullMQ;

  public queue = {} as RecursiveQueueClient;

  /**
   * Spread this into the imports array of the module that will use the queues.
   */
  static registerQueues() {
    return Object.values(QUEUES).map(({ queueName: name }) =>
      BullModule.registerQueue({ name }),
    );
  }

  constructor(
    @InjectQueue('claims-form-generation')
    private readonly claimsFormGenerationQueue: Queue,
    @InjectQueue('claims-notification')
    private readonly claimsNotificationQueue: Queue,
  ) {
    this.QUEUE_POOL.claimsFormGeneration = this.claimsFormGenerationQueue;
    this.QUEUE_POOL.claimsNotification = this.claimsNotificationQueue;

    /**
     * Generate the queue client, which is a recursive object that lets you type the queue name and the job name, for better queue DX.
     */
    this.queue = Object.keys(QUEUES).reduce((acc, key) => {
      acc[key] = {
        add: async (name: any, data: any) => {
          await this.QUEUE_POOL[key].add(name, data);
        },
      };
      return acc;
    }, {} as RecursiveQueueClient);
  }

  getPool() {
    return this.QUEUE_POOL;
  }
}
