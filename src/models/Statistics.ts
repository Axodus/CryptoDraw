/**
 * Modelos de estatísticas e métricas
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType } from './Ticket';

export interface GameStatistics {
  game: GameType;
  totalDraws: number;
  totalTickets: number;
  totalPrizesPaid: string;
  averageTicketsPerDraw: number;
  lastDrawId: number;
  nextDrawAt: Date;
  frequency: NumberFrequency;
  trends: NumberTrends;
  history: HistoricalResult[];
}

export interface NumberFrequency {
  [number: string]: {
    count: number;
    percentage: number;
    lastSeen: Date;
  };
}

export interface NumberTrends {
  hot: number[];      // números mais sorteados recentemente
  cold: number[];     // números menos sorteados
  overdue: number[];  // números há mais tempo sem sair
}

export interface HistoricalResult {
  drawId: number;
  date: Date;
  winningNumbers: number[];
  totalPrize: string;
  winnersCount: number;
  ticketsCount: number;
}

export interface UserStatistics {
  address: string;
  totalTickets: number;
  totalSpent: string;
  totalWon: string;
  winRate: number;
  favoriteNumbers: number[];
  gamesPlayed: {
    [GameType.LOTOFACIL]: GameUserStats;
    [GameType.SUPERSETE]: GameUserStats;
  };
}

export interface GameUserStats {
  ticketsBought: number;
  amountSpent: string;
  amountWon: string;
  wins: number;
  winsByTier: { [tier: number]: number };
  averageNumbersSelected: number[];
}

export interface GeneralStats {
  totalUsers: number;
  totalTicketsSold: number;
  totalPrizesDistributed: string;
  averageTicketPrice: string;
  mostPopularGame: GameType;
  largestPrize: {
    amount: string;
    drawId: number;
    game: GameType;
    winner: string;
  };
}