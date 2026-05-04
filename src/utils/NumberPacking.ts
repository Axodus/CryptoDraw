/**
 * Utilitários para packing/unpacking de números
 * Compatível com contratos Solidity - seção 3 da especificação
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { GameType } from '../models/Ticket';

export class NumberPacking {
  /**
   * EasyLotto: 15 números únicos em range 1-25
   * Usa bitmask de 25 bits para representar números selecionados
   * Bit i = 1 se número (i+1) foi selecionado
   */
  static packEasyLotto(numbers: number[]): number {
    if (!this.validateEasyLottoNumbers(numbers)) {
      throw new Error('Números inválidos para EasyLotto');
    }

    let bitmask = 0;
    numbers.forEach(num => {
      bitmask |= (1 << (num - 1));
    });
    return bitmask;
  }

  static unpackEasyLotto(packed: number): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (packed & (1 << i)) {
        numbers.push(i + 1);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  /**
  * SuperSeven: 7 colunas, cada uma com dígito 0-9
   * Usa 4 bits por coluna (28 bits total)
   * Coluna i ocupa bits [i*4, i*4+3]
   */
  static packSuperSeven(columns: number[]): number {
    if (!this.validateSuperSevenNumbers(columns)) {
      throw new Error('Números inválidos para SuperSeven');
    }

    let packed = 0;
    columns.forEach((digit, index) => {
      packed |= (digit << (index * 4));
    });
    return packed;
  }

  static unpackSuperSeven(packed: number): number[] {
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
      case GameType.EASYLOTTO:
        return this.packEasyLotto(numbers);
      case GameType.SUPERSEVEN:
        return this.packSuperSeven(numbers);
      default:
        throw new Error(`Tipo de jogo não suportado: ${game}`);
    }
  }

  /**
   * Função genérica para unpacking baseado no tipo do jogo
   */
  static unpackNumbers(packed: number, game: GameType): number[] {
    switch (game) {
      case GameType.EASYLOTTO:
        return this.unpackEasyLotto(packed);
      case GameType.SUPERSEVEN:
        return this.unpackSuperSeven(packed);
      default:
        throw new Error(`Tipo de jogo não suportado: ${game}`);
    }
  }

  /**
   * Validações
   */
  static validateEasyLottoNumbers(numbers: number[]): boolean {
    // Deve ter exatamente 15 números
    if (numbers.length !== 15) return false;
    
    // Todos devem estar no range 1-25
    if (!numbers.every(n => n >= 1 && n <= 25)) return false;
    
    // Devem ser únicos
    if (new Set(numbers).size !== numbers.length) return false;
    
    return true;
  }

  static validateSuperSevenNumbers(columns: number[]): boolean {
    // Deve ter exatamente 7 colunas
    if (columns.length !== 7) return false;
    
    // Todos devem estar no range 0-9
    if (!columns.every(n => n >= 0 && n <= 9)) return false;
    
    return true;
  }

  /**
   * Utilitários de conversão para display
   */
  static formatEasyLottoNumbers(numbers: number[]): string {
    return numbers.sort((a, b) => a - b).join(' - ');
  }

  static formatSuperSevenNumbers(columns: number[]): string {
    return columns.join(' | ');
  }

  /**
   * Geração de números aleatórios (Quick Pick)
   */
  static generateRandomEasyLotto(): number[] {
    const numbers: number[] = [];
    while (numbers.length < 15) {
      const num = Math.floor(Math.random() * 25) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  static generateRandomSuperSeven(): number[] {
    const columns: number[] = [];
    for (let i = 0; i < 7; i++) {
      columns.push(Math.floor(Math.random() * 10));
    }
    return columns;
  }

  // ---------- Aliases para compatibilidade legada ----------
  static packLotofacil(numbers: number[]): number { return this.packEasyLotto(numbers); }
  static unpackLotofacil(packed: number): number[] { return this.unpackEasyLotto(packed); }
  static packSupersete(columns: number[]): number { return this.packSuperSeven(columns); }
  static unpackSupersete(packed: number): number[] { return this.unpackSuperSeven(packed); }
  static validateLotofasilNumbers(numbers: number[]): boolean { return this.validateEasyLottoNumbers(numbers); }
  static validateSuperseteNumbers(columns: number[]): boolean { return this.validateSuperSevenNumbers(columns); }
  static formatLotofasilNumbers(numbers: number[]): string { return this.formatEasyLottoNumbers(numbers); }
  static formatSuperseteNumbers(columns: number[]): string { return this.formatSuperSevenNumbers(columns); }
  static generateRandomLotofacil(): number[] { return this.generateRandomEasyLotto(); }
  static generateRandomSupersete(): number[] { return this.generateRandomSuperSeven(); }
}