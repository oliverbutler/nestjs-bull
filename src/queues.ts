import {
  BullModule,
  Process,
  ProcessOptions,
  Processor,
  ProcessorOptions,
} from '@nestjs/bull';
import { z } from 'zod';
import { Job } from 'bull';

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
  CLAIMS_FORM_GENERATION: {
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
  CLAIMS_NOTIFICATION: {
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
export type TypedJob<
  T extends keyof Queues,
  TName extends Queues[T]['payload']['name'] | '*' = '*',
> = TName extends '*'
  ? Job<Queues[T]['payload']['data']> & Queues[T]['payload']
  : Job<Queues[T]['payload']['data']> & Queues[T]['payload'] & { name: TName };

export const TypedProcessor = (
  queue: keyof Queues,
  options?: Omit<ProcessorOptions, 'name'>,
) => {
  return Processor({ name: QUEUES[queue].queueName, ...options });
};

export const TypedProcess = <T extends keyof Queues>(
  queue: T,
  name: Queues[T]['payload']['name'] | '*',
  options?: Omit<ProcessOptions, 'name'>,
) => {
  return Process({ name, ...options });
};
