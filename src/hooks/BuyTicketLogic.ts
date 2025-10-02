/**
 * Lógica para compra de tickets
 * Compartilhado entre frontend e ferramentas admin
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType, BuyTicketParams } from '../models/Ticket';
import { NumberPacking } from '../utils/NumberPacking';

export interface BuyTicketOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
  contractAddress: string;
  provider: any; // Será tipado conforme implementação específica
}

// Estado da compra de ticket (para uso em stores/contextos)
export interface BuyTicketState {
  isPending: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Classe para gerenciar compra de tickets (implementação pura)
 */
export class BuyTicketManager {
  private options: BuyTicketOptions;
  private state: BuyTicketState = {
    isPending: false,
    error: null,
    txHash: null
  };

  constructor(options: BuyTicketOptions) {
    this.options = options;
  }

  getState(): BuyTicketState {
    return { ...this.state };
  }

  async buyTicket(params: BuyTicketParams): Promise<string> {
    try {
      this.state.isPending = true;
      this.state.error = null;
      this.state.txHash = null;

      // Validações
      const validationError = validateBuyTicketParams(params);
      if (validationError) {
        throw new Error(validationError);
      }

      // Empacotar números
      const packedNumbers = NumberPacking.packNumbers(params.numbers, params.game);

      // Preparar dados da transação
      const txData = {
  gameType: params.game === GameType.EASYLOTTO ? 0 : 1,
        numbers: packedNumbers.toString(),
        rounds: params.roundsBought,
        drawId: params.firstDrawId
      };

      // Estimar gas
      const gasEstimate = await this.options.provider.estimateGas({
        to: this.options.contractAddress,
        data: encodeBuyTicketCall(txData),
        value: params.paymentAmount
      });

      // Enviar transação
      const tx = await this.options.provider.sendTransaction({
        to: this.options.contractAddress,
        data: encodeBuyTicketCall(txData),
        value: params.paymentAmount,
        gasLimit: Math.floor(gasEstimate * 1.2) // 20% buffer
      });

      const hash = tx.hash;
      this.state.txHash = hash;

      // Aguardar confirmação
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transação falhou');
      }

      this.options.onSuccess?.(hash);
      return hash;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      this.state.error = errorMsg;
      this.options.onError?.(err instanceof Error ? err : new Error(errorMsg));
      throw err;
    } finally {
      this.state.isPending = false;
    }
  }

  reset(): void {
    this.state.isPending = false;
    this.state.error = null;
    this.state.txHash = null;
  }
}

/**
 * Valida parâmetros de compra de ticket
 */
export function validateBuyTicketParams(params: BuyTicketParams): string | null {
  if (!params.numbers || params.numbers.length === 0) {
    return 'Números não fornecidos';
  }

  if (params.game === GameType.EASYLOTTO) {
    if (params.numbers.length !== 15) {
      return 'Lotofácil deve ter exatamente 15 números';
    }
    
    for (const num of params.numbers) {
      if (num < 1 || num > 25) {
        return 'Números da Lotofácil devem estar entre 1 e 25';
      }
    }
  } else if (params.game === GameType.SUPERSEVEN) {
    if (params.numbers.length !== 7) {
      return 'SuperSete deve ter exatamente 7 números';
    }
    
    for (const num of params.numbers) {
      if (num < 0 || num > 9) {
        return 'Números do SuperSete devem estar entre 0 e 9';
      }
    }
  } else {
    return 'Tipo de jogo inválido';
  }

  if (params.roundsBought < 1 || params.roundsBought > 10) {
    return 'Número de concursos deve estar entre 1 e 10';
  }

  return null;
}

/**
 * Codifica a chamada de função do contrato
 */
export function encodeBuyTicketCall(data: {
  gameType: number;
  numbers: string;
  rounds: number;
  drawId: number;
}): string {
  // Esta implementação será específica da biblioteca Web3 usada
  // Por enquanto, retorna um placeholder
  return `0xbuyticket${JSON.stringify(data)}`;
}

/**
 * Classe para estimativa de preços
 */
export class PriceEstimator {
  private state = {
    isLoading: false,
    price: null as string | null,
    error: null as string | null
  };

  constructor(_options?: BuyTicketOptions) {
    // Options not needed for basic price estimation
  }

  getState() {
    return { ...this.state };
  }

  async estimatePrice(game: GameType, rounds: number): Promise<string> {
    try {
      this.state.isLoading = true;
      this.state.error = null;

      if (rounds < 1 || rounds > 10) {
        throw new Error('Número de concursos inválido');
      }

      // Base prices (in wei)
      const basePrices = {
  [GameType.EASYLOTTO]: '2000000000000000000', // 2 ONE
  [GameType.SUPERSEVEN]: '1000000000000000000'   // 1 ONE
      };

      const basePrice = BigInt(basePrices[game]);
      const totalPrice = basePrice * BigInt(rounds);
      
      this.state.price = totalPrice.toString();
      return totalPrice.toString();

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao estimar preço';
      this.state.error = errorMsg;
      throw new Error(errorMsg);
    } finally {
      this.state.isLoading = false;
    }
  }
}

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Classe para validação de números
 */
export class NumberValidator {
  private state = {
    isValid: false,
    errors: [] as string[]
  };

  validateNumbers(numbers: number[], game: GameType): ValidationResult {
    const errors: string[] = [];

    // Validar quantidade de números
  const expectedCount = game === GameType.EASYLOTTO ? 15 : 7;
    if (numbers.length !== expectedCount) {
      errors.push(`${game} deve ter exatamente ${expectedCount} números`);
    }

    // Validar range dos números
  if (game === GameType.EASYLOTTO) {
      const invalidNumbers = numbers.filter(n => n < 1 || n > 25);
      if (invalidNumbers.length > 0) {
        errors.push('Números devem estar entre 1 e 25');
      }
  } else if (game === GameType.SUPERSEVEN) {
      const invalidNumbers = numbers.filter(n => n < 0 || n > 9);
      if (invalidNumbers.length > 0) {
        errors.push('Números devem estar entre 0 e 9');
      }
    }

    // Validar números únicos (só para Lotofácil)
  if (game === GameType.EASYLOTTO) {
      const uniqueNumbers = new Set(numbers);
      if (uniqueNumbers.size !== numbers.length) {
        errors.push('Todos os números devem ser únicos');
      }
    }

    const isValid = errors.length === 0;
    
    this.state = { isValid, errors };
    
    return { isValid, errors };
  }

  getState() {
    return { ...this.state };
  }
}