import { Controller, Post } from '@nestjs/common';
import { queueClient } from './queues';

@Controller()
export class AppController {
  @Post('claim-form')
  async generateClaimForm() {
    await queueClient.claimsFormGeneration.add('generate', {
      claimId: 'testing-id-123',
    });
  }
}
