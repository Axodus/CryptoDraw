import { Router } from 'express';
import { ticketsRouter } from './tickets';

export const router = Router();

router.use('/tickets', ticketsRouter);
