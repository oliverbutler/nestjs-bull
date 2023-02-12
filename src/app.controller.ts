import { Controller, Param, Post } from '@nestjs/common';
import { QueueService } from './queues';

@Controller()
export class AppController {
  constructor(private readonly queueService: QueueService) {}

  @Post('/:id/submit')
  async generateClaimForm(@Param('id') id: string) {
    await this.queueService.queue.claimsFormGeneration.add(
      'generate',
      {
        claimId: id,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      },
    );
  }
}
