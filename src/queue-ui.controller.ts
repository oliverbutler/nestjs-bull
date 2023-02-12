import { createBullBoard } from '@bull-board/api';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';
import { ExpressAdapter } from '@bull-board/express';
import { Request, Response, All, Controller, Next } from '@nestjs/common';
import express from 'express';
import { getBullBoardQueues } from './queues';

@Controller('/queues/admin')
export class QueueUiController {
  @All('*')
  admin(
    @Request() req: express.Request,
    @Response() res: express.Response,
    @Next() next: express.NextFunction,
  ) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues/admin');
    const queues = getBullBoardQueues();
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
