import { Controller, Post } from '@nestjs/common';
import { EventsService } from './events/events.service';

@Controller()
export class AppController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('claim-form')
  generateClaimForm() {
    this.eventsService.generateClaimForm({
      name: 'generate',
      data: { claimId: 'my-claim-id' },
    });
  }
}
