/**
 * Componente NumberSelector compartilhado
 * Usado tanto no frontend quanto em ferramentas admin
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

// Interface para props do componente
export interface NumberSelectorProps {
  min: number;
  max: number;
  select: number;
  gameType: 'LOTOFACIL' | 'SUPERSETE';
  selectedNumbers?: number[];
  onSelectionChange: (numbers: number[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Lógica do seletor de números (sem dependências do React)
 * Pode ser usado em diferentes contextos
 */
export class NumberSelectorLogic {
  private selectedNumbers: number[] = [];
  private readonly config: {
    min: number;
    max: number;
    select: number;
    gameType: 'LOTOFACIL' | 'SUPERSETE';
  };

  constructor(config: { min: number; max: number; select: number; gameType: 'LOTOFACIL' | 'SUPERSETE' }) {
    this.config = config;
  }

  /**
   * Alterna seleção de um número
   */
  toggleNumber(number: number): { success: boolean; numbers: number[]; error?: string } {
    if (number < this.config.min || number > this.config.max) {
      return {
        success: false,
        numbers: this.selectedNumbers,
        error: `Número deve estar entre ${this.config.min} e ${this.config.max}`
      };
    }

    const currentIndex = this.selectedNumbers.indexOf(number);
    
    if (currentIndex >= 0) {
      // Remove número
      this.selectedNumbers = this.selectedNumbers.filter(n => n !== number);
    } else {
      // Adiciona número se não exceder limite
      if (this.selectedNumbers.length >= this.config.select) {
        return {
          success: false,
          numbers: this.selectedNumbers,
          error: `Máximo de ${this.config.select} números permitidos`
        };
      }
      this.selectedNumbers = [...this.selectedNumbers, number].sort((a, b) => a - b);
    }

    return {
      success: true,
      numbers: this.selectedNumbers
    };
  }

  /**
   * Define números selecionados
   */
  setSelectedNumbers(numbers: number[]): { success: boolean; numbers: number[]; error?: string } {
    const validation = this.validateNumbers(numbers);
    if (!validation.isValid) {
      return {
        success: false,
        numbers: this.selectedNumbers,
        error: validation.errors.join(', ')
      };
    }

    this.selectedNumbers = [...numbers].sort((a, b) => a - b);
    return {
      success: true,
      numbers: this.selectedNumbers
    };
  }

  /**
   * Limpa seleção
   */
  clearSelection(): number[] {
    this.selectedNumbers = [];
    return this.selectedNumbers;
  }

  /**
   * Gera seleção aleatória (Quick Pick)
   */
  generateRandomSelection(): number[] {
    this.selectedNumbers = [];
    
    if (this.config.gameType === 'LOTOFACIL') {
      while (this.selectedNumbers.length < this.config.select) {
        const num = Math.floor(Math.random() * (this.config.max - this.config.min + 1)) + this.config.min;
        if (!this.selectedNumbers.includes(num)) {
          this.selectedNumbers.push(num);
        }
      }
      this.selectedNumbers.sort((a, b) => a - b);
    } else if (this.config.gameType === 'SUPERSETE') {
      for (let i = 0; i < this.config.select; i++) {
        this.selectedNumbers.push(Math.floor(Math.random() * 10));
      }
    }

    return this.selectedNumbers;
  }

  /**
   * Valida números selecionados
   */
  validateNumbers(numbers: number[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.gameType === 'LOTOFACIL') {
      if (numbers.length !== this.config.select) {
        errors.push(`Selecione exatamente ${this.config.select} números`);
      }
      
      if (numbers.some(n => n < this.config.min || n > this.config.max)) {
        errors.push(`Números devem estar entre ${this.config.min} e ${this.config.max}`);
      }
      
      if (new Set(numbers).size !== numbers.length) {
        errors.push('Números devem ser únicos');
      }
    } else if (this.config.gameType === 'SUPERSETE') {
      if (numbers.length !== this.config.select) {
        errors.push(`Selecione exatamente ${this.config.select} colunas`);
      }
      
      if (numbers.some(n => n < 0 || n > 9)) {
        errors.push('Dígitos devem estar entre 0 e 9');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtém números selecionados
   */
  getSelectedNumbers(): number[] {
    return [...this.selectedNumbers];
  }

  /**
   * Verifica se número está selecionado
   */
  isNumberSelected(number: number): boolean {
    return this.selectedNumbers.includes(number);
  }

  /**
   * Obtém quantidade de números selecionados
   */
  getSelectedCount(): number {
    return this.selectedNumbers.length;
  }

  /**
   * Verifica se seleção está completa
   */
  isSelectionComplete(): boolean {
    return this.selectedNumbers.length === this.config.select;
  }

  /**
   * Obtém números disponíveis para seleção
   */
  getAvailableNumbers(): number[] {
    const available: number[] = [];
    for (let i = this.config.min; i <= this.config.max; i++) {
      available.push(i);
    }
    return available;
  }

  /**
   * Formata números para display
   */
  formatNumbers(): string {
    if (this.config.gameType === 'LOTOFACIL') {
      return this.selectedNumbers.join(' - ');
    } else {
      return this.selectedNumbers.join(' | ');
    }
  }
}

/**
 * Utilitários para renderização
 */
export class NumberSelectorUtils {
  /**
   * Gera grid de números para renderização
   */
  static generateNumberGrid(config: {
    min: number;
    max: number;
    gameType: 'LOTOFACIL' | 'SUPERSETE';
  }): number[][] {
    const numbers: number[] = [];
    for (let i = config.min; i <= config.max; i++) {
      numbers.push(i);
    }

    // Organiza em grid baseado no tipo do jogo
    if (config.gameType === 'LOTOFACIL') {
      // Grid 5x5 para Lotofácil (1-25)
      const grid: number[][] = [];
      for (let row = 0; row < 5; row++) {
        const rowNumbers: number[] = [];
        for (let col = 0; col < 5; col++) {
          const number = row * 5 + col + 1;
          if (number <= 25) {
            rowNumbers.push(number);
          }
        }
        if (rowNumbers.length > 0) {
          grid.push(rowNumbers);
        }
      }
      return grid;
    } else {
      // Grid 7x1 para SuperSete (7 colunas de 0-9)
      const grid: number[][] = [];
      for (let col = 0; col < 7; col++) {
        const colNumbers: number[] = [];
        for (let digit = 0; digit <= 9; digit++) {
          colNumbers.push(digit);
        }
        grid.push(colNumbers);
      }
      return grid;
    }
  }

  /**
   * Calcula estilos CSS para estados do número
   */
  static getNumberStyles(
    _number: number,
    isSelected: boolean,
    isDisabled: boolean,
    gameType: 'LOTOFACIL' | 'SUPERSETE'
  ): string {
    const baseStyles = [
      'cursor-pointer',
      'border',
      'rounded',
      'text-center',
      'font-medium',
      'transition-all',
      'duration-200'
    ];

    if (isDisabled) {
      baseStyles.push('opacity-50', 'cursor-not-allowed');
    } else if (isSelected) {
      baseStyles.push(
        'bg-blue-500',
        'text-white',
        'border-blue-500',
        'shadow-lg',
        'transform',
        'scale-105'
      );
    } else {
      baseStyles.push(
        'bg-white',
        'text-gray-700',
        'border-gray-300',
        'hover:border-blue-400',
        'hover:bg-blue-50'
      );
    }

    // Estilos específicos do jogo
    if (gameType === 'LOTOFACIL') {
      baseStyles.push('w-12', 'h-12', 'm-1');
    } else {
      baseStyles.push('w-10', 'h-10', 'm-0.5');
    }

    return baseStyles.join(' ');
  }

  /**
   * Gera padrões comuns de apostas
   */
  static generateCommonPatterns(gameType: 'LOTOFACIL' | 'SUPERSETE'): {
    name: string;
    description: string;
    numbers: number[];
  }[] {
    if (gameType === 'LOTOFACIL') {
      return [
        {
          name: 'Sequencial',
          description: 'Números em sequência',
          numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        },
        {
          name: 'Pares',
          description: 'Apenas números pares',
          numbers: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
        },
        {
          name: 'Ímpares',
          description: 'Apenas números ímpares',
          numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]
        }
      ];
    } else {
      return [
        {
          name: 'Todos Zeros',
          description: 'Todas as colunas com 0',
          numbers: [0, 0, 0, 0, 0, 0, 0]
        },
        {
          name: 'Sequencial',
          description: 'Números em sequência',
          numbers: [1, 2, 3, 4, 5, 6, 7]
        }
      ];
    }
  }
}