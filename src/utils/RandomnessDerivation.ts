/**
 * Utilitários para derivação de randomness
 * Implementa algoritmos da seção 10 da especificação
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType } from '../models/Ticket';
import { NumberPacking } from './NumberPacking';

export class RandomnessDerivation {
  /**
   * Deriva números vencedores do EasyLotto a partir do randomness
   * Seleciona 15 números únicos no range 1-25
   */
  static deriveEasyLottoWinning(randomness: string): number[] {
    const numbers: number[] = [];
    const randomBytes = this.hexToBytes(randomness);
    
    let byteIndex = 0;
    let attempts = 0;
    const maxAttempts = 1000; // Previne loop infinito
    
    while (numbers.length < 15 && attempts < maxAttempts) {
      // Usa 2 bytes para gerar número no range 1-25
      const byte1 = randomBytes[byteIndex % randomBytes.length];
      const byte2 = randomBytes[(byteIndex + 1) % randomBytes.length];
      
      const randomValue = (byte1 << 8) | byte2;
      const number = (randomValue % 25) + 1;
      
      if (!numbers.includes(number)) {
        numbers.push(number);
      }
      
      byteIndex += 2;
      attempts++;
    }
    
    if (numbers.length < 15) {
  throw new Error('Falha ao derivar números suficientes do randomness');
    }
    
    return numbers.sort((a, b) => a - b);
  }

  /**
   * Deriva números vencedores do SuperSeven a partir do randomness
   * Seleciona 7 dígitos no range 0-9
   */
  static deriveSuperSevenWinning(randomness: string): number[] {
    const columns: number[] = [];
    const randomBytes = this.hexToBytes(randomness);
    
    for (let i = 0; i < 7; i++) {
      const byte = randomBytes[i % randomBytes.length];
      const digit = byte % 10;
      columns.push(digit);
    }
    
    return columns;
  }

  /**
   * Converte números vencedores para formato packed
   */
  static toPackedFormat(numbers: number[], game: GameType): number {
    return NumberPacking.packNumbers(numbers, game);
  }

  /**
   * Deriva números vencedores baseado no tipo do jogo
   */
  static deriveWinningNumbers(randomness: string, game: GameType): number[] {
    switch (game) {
      case GameType.EASYLOTTO:
        return this.deriveEasyLottoWinning(randomness);
      case GameType.SUPERSEVEN:
        return this.deriveSuperSevenWinning(randomness);
      default:
        throw new Error(`Tipo de jogo não suportado: ${game}`);
    }
  }

  /**
   * Simula derivação para testes (usa seed determinística)
   */
  static simulateRandomness(seed: string, game: GameType): {
    randomness: string;
    winningNumbers: number[];
    packed: number;
  } {
    // Gera pseudo-randomness a partir do seed
    const hash = this.simpleHash(seed);
    const randomness = '0x' + hash;
    
    const winningNumbers = this.deriveWinningNumbers(randomness, game);
    const packed = this.toPackedFormat(winningNumbers, game);
    
    return {
      randomness,
      winningNumbers,
      packed
    };
  }

  /**
   * Valida randomness recebido do Chainlink
   */
  static validateRandomness(randomness: string): boolean {
    // Deve ser hex string válida
    if (!/^0x[a-fA-F0-9]{64}$/.test(randomness)) {
      return false;
    }
    
    // Não deve ser zero
    if (randomness === '0x' + '0'.repeat(64)) {
      return false;
    }
    
    return true;
  }

  /**
   * Calcula estatísticas de distribuição dos números derivados
   */
  static analyzeRandomness(randomness: string, iterations: number = 1000): {
    easyLotto: { [key: number]: number };
    superSeven: { [key: number]: number };
  } {
    const easyLottoFreq: { [key: number]: number } = {};
    const superSevenFreq: { [key: number]: number } = {};
    
    // Inicializa contadores
  for (let i = 1; i <= 25; i++) easyLottoFreq[i] = 0;
  for (let i = 0; i <= 9; i++) superSevenFreq[i] = 0;
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      // Modifica randomness para cada iteração
      const modifiedRandomness = this.modifyRandomness(randomness, iteration);
      
      // Analisa EasyLotto
      const easyLottoNumbers = this.deriveEasyLottoWinning(modifiedRandomness);
      easyLottoNumbers.forEach(num => easyLottoFreq[num]++);
      
      // Analisa SuperSeven
      const superSevenNumbers = this.deriveSuperSevenWinning(modifiedRandomness);
      superSevenNumbers.forEach(num => superSevenFreq[num]++);
    }
    
    return {
      easyLotto: easyLottoFreq,
      superSeven: superSevenFreq
    };
  }

  // Aliases legados para compatibilidade
  static deriveLotofacilWinning(randomness: string): number[] { return this.deriveEasyLottoWinning(randomness); }
  static deriveSuperseteWinning(randomness: string): number[] { return this.deriveSuperSevenWinning(randomness); }

  /**
   * Utilitários privados
   */
  private static hexToBytes(hex: string): number[] {
    const cleanHex = hex.replace('0x', '');
    const bytes: number[] = [];
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    
    return bytes;
  }

  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Expande para 64 caracteres hex
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    return (hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr).slice(0, 64);
  }

  private static modifyRandomness(randomness: string, iteration: number): string {
    const bytes = this.hexToBytes(randomness);
    
    // Modifica alguns bytes baseado na iteração
    const modifiedBytes = bytes.map((byte, index) => {
      if (index % 4 === 0) {
        return (byte + iteration) % 256;
      }
      return byte;
    });
    
    const hex = modifiedBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hex;
  }

  /**
   * Gera mock randomness para testes
   */
  static generateMockRandomness(): string {
    const bytes: number[] = [];
    for (let i = 0; i < 32; i++) {
      bytes.push(Math.floor(Math.random() * 256));
    }
    
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hex;
  }
}