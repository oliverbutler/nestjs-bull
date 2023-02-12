import { BullModule, Processor, ProcessorOptions } from '@nestjs/bullmq';
import { WorkerOptions, Job, Queue, JobsOptions } from 'bullmq';
import { z, ZodError } from 'zod';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

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
    queueName: (typeof QUEUES)[K]['queueName'];
    payload: z.input<(typeof QUEUES)[K]['payload']>;
  };
};

export const QueueProcessor = Object.keys(QUEUES).reduce(
  (acc, queue) => ({
    ...acc,
    [queue]: (workerOptions, options) =>
      Processor({ name: QUEUES[queue].queueName, ...options }, workerOptions),
  }),
  {} as {
    [key in keyof Queues]: (
      workerOptions?: WorkerOptions,
      options?: Omit<ProcessorOptions, 'name'>,
    ) => ClassDecorator;
  },
);

type QueuesWithBullMQ = {
  [key in keyof Queues]: Queue<Queues[key]['payload']['data'], unknown>;
};

type RecursiveQueueClient = {
  [key in keyof Queues]: {
    add: <TName extends Queues[key]['payload']['name']>(
      name: TName,
      data: (Queues[key]['payload'] & { name: TName })['data'],
      opts?: JobsOptions,
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

  private readonly logger = new Logger(QueueService.name);

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
        add: async (name: string, data: any, opts?: JobsOptions) => {
          const queue: Queue = this.QUEUE_POOL[key];

          await queue.add(name, data, opts);
        },
      };
      return acc;
    }, {} as RecursiveQueueClient);
  }

  getPool() {
    return this.QUEUE_POOL;
  }

  parseJobPayload<TName extends keyof Queues>(
    job: Job,
    name: TName,
  ): z.infer<(typeof QUEUES)[TName]['payload']> {
    const expectedQueueName = QUEUES[name].queueName;

    if (job.queueName !== expectedQueueName) {
      const message = `Expected job to be in queue ${expectedQueueName}, but it was in ${job.queueName}`;
      this.logger.error(message);
      throw new Error(message);
    }

    const payloadToTest = {
      name: job.name,
      data: job.data,
    };

    try {
      const payload = QUEUES[name].payload.parse(payloadToTest);

      return payload;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(
          `Job ${job.id} in queue ${job.queueName} failed to parse payload: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Job ${job.id} in queue ${job.queueName} failed for unknown reason`,
        );
      }
      throw error;
    }
  }
}
