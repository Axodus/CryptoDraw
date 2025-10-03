import { Router } from 'express';
import { ticketsRouter } from './tickets';
import { healthRouter } from './health';

export const router = Router();

router.use('/tickets', ticketsRouter);
router.use('/health', healthRouter);
