export enum GameType {
  EASYLOTTO = 0,
  SUPERSEVEN = 1,
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REDEEMED = 'REDEEMED',
  BURNED = 'BURNED',
}

export interface Ticket {
  id: string;
  owner: string;
  game: GameType;
  numbers: number[];
  numbersPacked: string;
  roundsBought: number;
  roundsRemaining: number;
  firstDrawId: number;
  createdAt: Date;
  expirationAt: Date;
  status: TicketStatus;
  transactionHash: string;
  blockNumber: number;
}
