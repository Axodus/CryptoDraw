import { Router, Request, Response } from 'express';
import { TicketController } from '../../controllers/TicketController';
import { BlockchainService } from '../../services/BlockchainService';

const blockchain = new BlockchainService();
const controller = new TicketController(blockchain);

export const ticketsRouter = Router();

ticketsRouter.get('/:ticketId', (req: Request, res: Response) => {
  controller.getTicket(req as any, res as any);
});

ticketsRouter.get('/user/:address', (req: Request, res: Response) => {
  controller.getUserTickets(req as any, res as any);
});

ticketsRouter.get('/:ticketId/proof', (req: Request, res: Response) => {
  controller.getWinningProof(req as any, res as any);
});

ticketsRouter.post('/validate', (req: Request, res: Response) => {
  controller.validateTicketNumbers(req as any, res as any);
});
