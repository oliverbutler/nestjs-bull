import { createBullBoard } from '@bull-board/api';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';
import { BullMQAdapter, ExpressAdapter } from '@bull-board/express';
import { Request, Response, All, Controller, Next } from '@nestjs/common';
import express from 'express';
import { QueueService } from './queues';

@Controller('/queues/admin')
export class QueueUiController {
  constructor(private readonly queueService: QueueService) {}

  private getBullBoardQueues() {
    const bullBoardQueues = Object.values(this.queueService.getPool()).reduce(
      (acc: BullMQAdapter[], val) => {
        acc.push(new BullMQAdapter(val));
        return acc;
      },
      [] as BullMQAdapter[],
    );

    return bullBoardQueues;
  }

  @All('*')
  admin(
    @Request() req: express.Request,
    @Response() res: express.Response,
    @Next() next: express.NextFunction,
  ) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues/admin');
    const queues = this.getBullBoardQueues();
    const router = serverAdapter.getRouter() as express.Express;
    const { addQueue } = createBullBoard({
      queues: [],
      serverAdapter,
    });
    queues.forEach((queue: BaseAdapter) => {
      addQueue(queue);
    });

    const entryPointPath = '/queues/admin/';
    req.url = req.url.replace(entryPointPath, '/');
    router(req, res, next);
  }
}
