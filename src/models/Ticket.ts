/**
 * Tipos e interfaces compartilhados entre frontend e backend
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

export enum GameType {
  EASYLOTTO = 0,
  SUPERSEVEN = 1,
  // Aliases legados para compatibilidade
  LOTOFACIL = 0,
  SUPERSETE = 1,
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REDEEMED = 'REDEEMED',
  BURNED = 'BURNED',
}

export enum DrawStatus {
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CONSOLIDATED = 'CONSOLIDATED',
  RANDOM_REQUESTED = 'RANDOM_REQUESTED',
  RANDOM_FULFILLED = 'RANDOM_FULFILLED',
  SETTLED = 'SETTLED',
}

export interface Ticket {
  id: string;                    // ticketId on-chain
  owner: string;                 // address
  game: GameType;               // EASYLOTTO | SUPERSEVEN
  numbers: number[];            // números escolhidos
  numbersPacked: string;        // representação compacta
  roundsBought: number;
  roundsRemaining: number;
  firstDrawId: number;
  createdAt: Date;
  expirationAt: Date;
  status: TicketStatus;
  transactionHash: string;
  blockNumber: number;
}

export interface Draw {
  id: number;
  game: GameType;
  scheduledAt: Date;
  cutoffAt: Date;
  status: DrawStatus;
  merkleRoot?: string;
  totalPoolUSD?: string;
  randomness?: string;
  winningNumbers?: number[];
  winningPacked?: string;
  ticketCount: number;
  results?: DrawResults;
}

export interface DrawResults {
  totalPrize: string;
  winners: WinnersByTier;
  payouts: PayoutsByTier;
}

export interface WinnersByTier {
  [tier: number]: {
    count: number;
    prizePerWinner: string;
    totalPrize: string;
  };
}

export interface PayoutsByTier {
  [tier: number]: string;
}

export interface BuyTicketParams {
  game: GameType;
  numbers: number[];
  roundsBought: number;
  firstDrawId: number;
  maxPaymentAmount: string;
  paymentAmount: string;
}

export interface ClaimPrizeParams {
  ticketId: string;
  merkleProof: string[];
  expectedTier: number;
}

export interface GameConfig {
  minNumbers: number;
  maxNumbers: number;
  selectCount: number;
  tiers: TierConfig[];
  ticketPrice: string;
}

export interface TierConfig {
  tier: number;
  matchCount: number;
  prizeShare: number; // percentual do pool
}