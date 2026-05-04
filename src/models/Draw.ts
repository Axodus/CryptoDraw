/**
 * Modelos de Draw e eventos relacionados
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType, DrawStatus, DrawResults } from './Ticket';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface DrawEvent {
  drawId: number;
  game: GameType;
  scheduledAt: Date;
  cutoffAt: Date;
  blockNumber: number;
  transactionHash: string;
}

export interface RandomnessRequestEvent {
  drawId: number;
  requestId: string;
  blockNumber: number;
  transactionHash: string;
}

export interface RandomnessFulfilledEvent {
  drawId: number;
  requestId: string;
  randomness: string;
  winningNumbers: number[];
  blockNumber: number;
  transactionHash: string;
}

export interface ConsolidationEvent {
  drawId: number;
  merkleRoot: string;
  totalPool: string;
  ticketCount: number;
  blockNumber: number;
  transactionHash: string;
}

export interface TicketMintedEvent {
  ticketId: string;
  owner: string;
  game: GameType;
  numbersPacked: string;
  roundsBought: number;
  firstDrawId: number;
  blockNumber: number;
  transactionHash: string;
}

export interface PrizeClaimedEvent {
  ticketId: string;
  winner: string;
  tier: number;
  amount: string;
  blockNumber: number;
  transactionHash: string;
}