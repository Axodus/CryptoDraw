/**
 * Utilitários para packing/unpacking de números
 * Compatível com contratos Solidity - seção 3 da especificação
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType } from '../models/Ticket';

export class NumberPacking {
  /**
   * Lotofácil: 15 números únicos em range 1-25
   * Usa bitmask de 25 bits para representar números selecionados
   * Bit i = 1 se número (i+1) foi selecionado
   */
  static packLotofacil(numbers: number[]): number {
    if (!this.validateLotofasilNumbers(numbers)) {
      throw new Error('Números inválidos para Lotofácil');
    }

    let bitmask = 0;
    numbers.forEach(num => {
      bitmask |= (1 << (num - 1));
    });
    return bitmask;
  }

  static unpackLotofacil(packed: number): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (packed & (1 << i)) {
        numbers.push(i + 1);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  /**
   * SuperSete: 7 colunas, cada uma com dígito 0-9
   * Usa 4 bits por coluna (28 bits total)
   * Coluna i ocupa bits [i*4, i*4+3]
   */
  static packSupersete(columns: number[]): number {
    if (!this.validateSuperseteNumbers(columns)) {
      throw new Error('Números inválidos para SuperSete');
    }

    let packed = 0;
    columns.forEach((digit, index) => {
      packed |= (digit << (index * 4));
    });
    return packed;
  }

  static unpackSupersete(packed: number): number[] {
    const columns: number[] = [];
    for (let i = 0; i < 7; i++) {
      columns.push((packed >> (i * 4)) & 0xF);
    }
    return columns;
  }

  /**
   * Função genérica para packing baseado no tipo do jogo
   */
  static packNumbers(numbers: number[], game: GameType): number {
    switch (game) {
      case GameType.LOTOFACIL:
        return this.packLotofacil(numbers);
      case GameType.SUPERSETE:
        return this.packSupersete(numbers);
      default:
        throw new Error(`Tipo de jogo não suportado: ${game}`);
    }
  }

  /**
   * Função genérica para unpacking baseado no tipo do jogo
   */
  static unpackNumbers(packed: number, game: GameType): number[] {
    switch (game) {
      case GameType.LOTOFACIL:
        return this.unpackLotofacil(packed);
      case GameType.SUPERSETE:
        return this.unpackSupersete(packed);
      default:
        throw new Error(`Tipo de jogo não suportado: ${game}`);
    }
  }

  /**
   * Validações
   */
  static validateLotofasilNumbers(numbers: number[]): boolean {
    // Deve ter exatamente 15 números
    if (numbers.length !== 15) return false;
    
    // Todos devem estar no range 1-25
    if (!numbers.every(n => n >= 1 && n <= 25)) return false;
    
    // Devem ser únicos
    if (new Set(numbers).size !== numbers.length) return false;
    
    return true;
  }

  static validateSuperseteNumbers(columns: number[]): boolean {
    // Deve ter exatamente 7 colunas
    if (columns.length !== 7) return false;
    
    // Todos devem estar no range 0-9
    if (!columns.every(n => n >= 0 && n <= 9)) return false;
    
    return true;
  }

  /**
   * Utilitários de conversão para display
   */
  static formatLotofasilNumbers(numbers: number[]): string {
    return numbers.sort((a, b) => a - b).join(' - ');
  }

  static formatSuperseteNumbers(columns: number[]): string {
    return columns.join(' | ');
  }

  /**
   * Geração de números aleatórios (Quick Pick)
   */
  static generateRandomLotofacil(): number[] {
    const numbers: number[] = [];
    while (numbers.length < 15) {
      const num = Math.floor(Math.random() * 25) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  static generateRandomSupersete(): number[] {
    const columns: number[] = [];
    for (let i = 0; i < 7; i++) {
      columns.push(Math.floor(Math.random() * 10));
    }
    return columns;
  }
}