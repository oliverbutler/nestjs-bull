import { Controller, Post } from '@nestjs/common';
import { QueueService } from './queues';

@Controller()
export class AppController {
  constructor(private readonly queueService: QueueService) {}

  @Post('claim-form')
  async generateClaimForm() {
    await this.queueService.queue.claimsFormGeneration.add('generate', {
      claimId: 'testing-id-123',
    });
  }
}
