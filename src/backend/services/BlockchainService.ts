export type Ticket = any;

export class BlockchainService {
  async getTicket(ticketId: string): Promise<Ticket | null> {
    // TODO: Integrate with on-chain or indexer
    return null;
  }

  async getUserTickets(_address: string): Promise<Ticket[]> {
    return [];
  }

  async checkWinning(_ticketId: string, _drawId: number): Promise<{ isWinner: boolean; tier?: number; prizeAmount?: string; }> {
    return { isWinner: false };
  }
}
