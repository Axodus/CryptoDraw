/**
 * Service para interação com contratos inteligentes
 * Compartilhado entre frontend e backend
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType, Ticket, Draw } from '../models/Ticket';
import { NumberPacking } from '../utils/NumberPacking';

// Interface para provider blockchain (será implementada diferentemente no front/back)
export interface BlockchainProvider {
  getTicket(ticketId: string): Promise<any>;
  getDraw(drawId: number): Promise<any>;
  call(contract: string, method: string, params: any[]): Promise<any>;
  send(contract: string, method: string, params: any[], options?: any): Promise<string>;
  waitForTransaction(txHash: string): Promise<any>;
  getCurrentBlock(): Promise<number>;
  getLogs(filter: any): Promise<any[]>;
}

export class BlockchainService {
  private provider: BlockchainProvider;
  private contractAddress: string;

  constructor(provider: BlockchainProvider, contractAddress: string, _abi: any[]) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    // ABI is passed but not stored - provider handles contract interactions
  }

  /**
   * Busca informações de um ticket
   */
  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const ticketData = await this.provider.call(
        this.contractAddress,
        'tickets',
        [ticketId]
      );

      if (!ticketData || ticketData.owner === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      const numbers = NumberPacking.unpackNumbers(
        ticketData.numbersPacked.toNumber(),
        ticketData.game
      );

      return {
        id: ticketId,
        owner: ticketData.owner,
        game: ticketData.game,
        numbers,
        numbersPacked: ticketData.numbersPacked.toString(),
        roundsBought: ticketData.roundsBought,
        roundsRemaining: ticketData.roundsRemaining,
        firstDrawId: ticketData.firstDrawId,
        createdAt: new Date(ticketData.createdAt * 1000),
        expirationAt: new Date(ticketData.expirationAt * 1000),
        status: this.mapTicketStatus(ticketData.status),
        transactionHash: '', // Será preenchido pelo indexador
        blockNumber: 0        // Será preenchido pelo indexador
      };
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
      return null;
    }
  }

  /**
   * Busca informações de um draw
   */
  async getDraw(drawId: number): Promise<Draw | null> {
    try {
      const drawData = await this.provider.call(
        this.contractAddress,
        'draws',
        [drawId]
      );

      if (!drawData || drawData.scheduledAt === 0) {
        return null;
      }

      const winningNumbers = drawData.winningNumbers 
        ? NumberPacking.unpackNumbers(drawData.winningNumbers.toNumber(), drawData.game)
        : undefined;

      return {
        id: drawId,
        game: drawData.game,
        scheduledAt: new Date(drawData.scheduledAt * 1000),
        cutoffAt: new Date(drawData.cutoffAt * 1000),
        status: this.mapDrawStatus(drawData.status),
        merkleRoot: drawData.merkleRoot || undefined,
        totalPoolUSD: drawData.totalPoolUSD?.toString(),
        randomness: drawData.randomness || undefined,
        winningNumbers,
        winningPacked: drawData.winningNumbers?.toString(),
        ticketCount: drawData.ticketCount || 0
      };
    } catch (error) {
      console.error('Erro ao buscar draw:', error);
      return null;
    }
  }

  /**
   * Busca tickets de um usuário
   */
  async getUserTickets(userAddress: string): Promise<Ticket[]> {
    try {
      const ticketIds = await this.provider.call(
        this.contractAddress,
        'getUserTickets',
        [userAddress]
      );

      const tickets: Ticket[] = [];
      for (const ticketId of ticketIds) {
        const ticket = await this.getTicket(ticketId.toString());
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Erro ao buscar tickets do usuário:', error);
      return [];
    }
  }

  /**
   * Busca próximo draw de um jogo
   */
  async getNextDraw(game: GameType): Promise<Draw | null> {
    try {
      const nextDrawId = await this.provider.call(
        this.contractAddress,
        'getNextDrawId',
        [game]
      );

      return await this.getDraw(nextDrawId.toNumber());
    } catch (error) {
      console.error('Erro ao buscar próximo draw:', error);
      return null;
    }
  }

  /**
   * Calcula preço do ticket
   */
  async calculateTicketPrice(params: {
    game: GameType;
    roundsBought: number;
  }): Promise<string> {
    try {
      const price = await this.provider.call(
        this.contractAddress,
        'calculateTicketPrice',
        [params.game, params.roundsBought]
      );

      return price.toString();
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      return '0';
    }
  }

  /**
   * Verifica se números são vencedores
   */
  async checkWinning(ticketId: string, drawId: number): Promise<{
    isWinner: boolean;
    tier: number;
    prizeAmount: string;
  }> {
    try {
      const result = await this.provider.call(
        this.contractAddress,
        'checkWinning',
        [ticketId, drawId]
      );

      return {
        isWinner: result.isWinner,
        tier: result.tier,
        prizeAmount: result.prizeAmount.toString()
      };
    } catch (error) {
      console.error('Erro ao verificar vitória:', error);
      return {
        isWinner: false,
        tier: 0,
        prizeAmount: '0'
      };
    }
  }

  /**
   * Busca configuração do jogo
   */
  async getGameConfig(game: GameType): Promise<any> {
    try {
      const config = await this.provider.call(
        this.contractAddress,
        'gameConfigs',
        [game]
      );

      return config;
    } catch (error) {
      console.error('Erro ao buscar config do jogo:', error);
      return null;
    }
  }

  /**
   * Busca eventos de um bloco específico
   */
  async getEventsFromBlock(blockNumber: number): Promise<any[]> {
    try {
      const filter = {
        address: this.contractAddress,
        fromBlock: blockNumber,
        toBlock: blockNumber
      };

      return await this.provider.getLogs(filter);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Monitora eventos em tempo real
   */
  async subscribeToEvents(_callback: (event: any) => void): Promise<void> {
    // TODO: Implementação específica do provider
    // Frontend: usando WebSocket
    // Backend: usando polling ou WebSocket
    throw new Error('subscribeToEvents not implemented yet');
  }

  /**
   * Mappers de status
   */
  private mapTicketStatus(status: number): any {
    const statusMap: any = {
      0: 'ACTIVE',
      1: 'EXPIRED', 
      2: 'REDEEMED',
      3: 'BURNED'
    };
    return statusMap[status] || 'UNKNOWN';
  }

  private mapDrawStatus(status: number): any {
    const statusMap: any = {
      0: 'SCHEDULED',
      1: 'OPEN',
      2: 'CLOSED',
      3: 'CONSOLIDATED',
      4: 'RANDOM_REQUESTED',
      5: 'RANDOM_FULFILLED',
      6: 'SETTLED'
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * Utilitários de validação
   */
  static validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static validateTicketId(ticketId: string): boolean {
    return /^\d+$/.test(ticketId) && parseInt(ticketId) > 0;
  }

  static validateDrawId(drawId: number): boolean {
    return Number.isInteger(drawId) && drawId > 0;
  }
}