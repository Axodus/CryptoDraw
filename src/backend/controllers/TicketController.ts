/**
 * Ticket management controller
 * Backend API - CryptoDraw
 */

import type { Request, Response } from 'express';

import { Ticket, GameType } from '../types/Ticket';
import { BlockchainService } from '../services/BlockchainService';

export class TicketController {
  private blockchainService: BlockchainService;

  constructor(blockchainService: BlockchainService) {
    this.blockchainService = blockchainService;
  }

  /**
   * GET /api/tickets/:ticketId
   * Fetch a single ticket by id
   */
  async getTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;

      if (!ticketId || !this.isValidTicketId(ticketId)) {
        res.status(400).json({
          error: 'Invalid ticket id',
          code: 'INVALID_TICKET_ID',
        });
        return;
      }

      const ticket = await this.blockchainService.getTicket(ticketId);

      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
        return;
      }

      res.json({
        success: true,
        data: ticket
      });

    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * GET /api/tickets/user/:address
   * Fetch all tickets for a given user
   */
  async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { game, status, limit = "50", offset = "0" } = req.query as Record<string, string>;

      if (!this.isValidAddress(address)) {
        res.status(400).json({ error: 'Invalid address', code: 'INVALID_ADDRESS' });
        return;
      }

      let tickets = await this.blockchainService.getUserTickets(address);

      // Filtrar por jogo se especificado
      if (game !== undefined) {
        const gameType = Number(game);
        if (gameType === GameType.EASYLOTTO || gameType === GameType.SUPERSEVEN) {
          tickets = tickets.filter(ticket => ticket.game === gameType);
        }
      }

      // Filtrar por status se especificado
      if (status) {
        tickets = tickets.filter(ticket => ticket.status === status);
      }

      // Paginação
  const off = Number(offset) || 0;
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const paginatedTickets = tickets.slice(off, off + lim);

      res.json({
        success: true,
        data: {
          tickets: paginatedTickets,
          total: tickets.length,
          limit: lim,
          offset: off,
        }
      });

    } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * GET /api/tickets/:ticketId/proof
   * Get winning proof for a ticket
   */
  async getWinningProof(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { drawId } = req.query as Record<string, string>;

      if (!this.isValidTicketId(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket id', code: 'INVALID_TICKET_ID' });
        return;
      }

      if (!drawId || !this.isValidDrawId(Number(drawId))) {
        res.status(400).json({ error: 'Invalid draw id', code: 'INVALID_DRAW_ID' });
        return;
      }

      // Buscar ticket e verificar se é vencedor
      const ticket = await this.blockchainService.getTicket(ticketId);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
        return;
      }

      // Verificar vitória
      const winningResult = await this.blockchainService.checkWinning(ticketId, Number(drawId));

      if (!winningResult.isWinner) {
        res.status(404).json({ error: 'Ticket is not a winner in this draw', code: 'NOT_A_WINNER' });
        return;
      }

      // TODO: Fetch Merkle proof from database/indexer
      // Temporary placeholder
      const proof = {
        ticketId,
        drawId: Number(drawId),
        tier: winningResult.tier,
        prizeAmount: winningResult.prizeAmount,
        merkleProof: [], // TODO: implement real lookup
        leafIndex: 0     // TODO: implement real lookup
      };

      res.json({
        success: true,
        data: proof
      });

    } catch (error) {
      console.error('Error fetching proof:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * POST /api/tickets/validate
   * Validate ticket numbers before purchase
   */
  async validateTicketNumbers(req: Request, res: Response): Promise<void> {
    try {
      const { numbers, game } = req.body;

      if (!numbers || !Array.isArray(numbers)) {
        res.status(400).json({ error: 'Numbers are required and must be an array', code: 'INVALID_NUMBERS' });
        return;
      }

      if (game === undefined || (game !== GameType.EASYLOTTO && game !== GameType.SUPERSEVEN)) {
        res.status(400).json({
          error: 'Invalid game type',
          code: 'INVALID_GAME_TYPE',
        });
        return;
      }

      const validation = this.validateNumbers(numbers, game);

      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          packedNumbers: validation.isValid ? validation.packed : null
        }
      });

    } catch (error) {
      console.error('Error validating numbers:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  /**
   * Private validations/helpers
   */
  private isValidTicketId(ticketId: string): boolean {
    return /^\d+$/.test(ticketId) && parseInt(ticketId) > 0;
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidDrawId(drawId: number): boolean {
    return Number.isInteger(drawId) && drawId > 0;
  }

  private validateNumbers(numbers: number[], game: GameType): {
    isValid: boolean;
    errors: string[];
    packed?: number;
  } {
    const errors: string[] = [];

  if (game === GameType.EASYLOTTO) {
      if (numbers.length !== 15) {
    errors.push('EasyLotto must have exactly 15 numbers');
      }
      
      if (numbers.some(n => n < 1 || n > 25)) {
        errors.push('Numbers must be between 1 and 25');
      }
      
      if (new Set(numbers).size !== numbers.length) {
        errors.push('Numbers must be unique');
      }
    } else if (game === GameType.SUPERSEVEN) {
      if (numbers.length !== 7) {
        errors.push('SuperSeven must have exactly 7 digits');
      }
      
      if (numbers.some(n => n < 0 || n > 9)) {
        errors.push('Digits must be between 0 and 9');
      }
    }

    const isValid = errors.length === 0;
    let packed: number | undefined;

    if (isValid) {
      // TODO: usar NumberPacking quando instalado
      packed = 0; // Placeholder
    }

    return { isValid, errors, packed };
  }
}