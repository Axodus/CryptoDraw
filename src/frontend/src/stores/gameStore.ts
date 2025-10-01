/**
 * Store Zustand para gerenciamento de estado do jogo
 * Frontend React - Game State Management
 */

// Interface para o estado do jogo (sem dependências externas por enquanto)
interface GameState {
  selectedNumbers: number[];
  selectedGame: 'LOTOFACIL' | 'SUPERSETE';
  roundsBought: number;
  paymentMethod: 'ETH' | 'USDC' | 'wONE';
}

// Game actions will be included in the store interface

// Placeholder para Zustand (será implementado quando instalado)
export const gameStoreLogic = {
  initialState: (): GameState => ({
    selectedNumbers: [],
    selectedGame: 'LOTOFACIL',
    roundsBought: 1,
    paymentMethod: 'wONE'
  }),

  actions: {
    setSelectedNumbers: (state: GameState, numbers: number[]): GameState => ({
      ...state,
      selectedNumbers: numbers
    }),

    setSelectedGame: (state: GameState, game: 'LOTOFACIL' | 'SUPERSETE'): GameState => ({
      ...state,
      selectedGame: game,
      selectedNumbers: [] // Limpa seleção ao trocar jogo
    }),

    setRoundsBought: (state: GameState, rounds: number): GameState => ({
      ...state,
      roundsBought: Math.max(1, Math.min(6, rounds))
    }),

    setPaymentMethod: (state: GameState, method: 'ETH' | 'USDC' | 'wONE'): GameState => ({
      ...state,
      paymentMethod: method
    }),

    clearSelection: (state: GameState): GameState => ({
      ...state,
      selectedNumbers: []
    }),

    resetState: (): GameState => gameStoreLogic.initialState()
  }
};

// Validações para o estado do jogo
export const gameStateValidations = {
  validateSelectedNumbers: (numbers: number[], game: 'LOTOFACIL' | 'SUPERSETE'): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    if (game === 'LOTOFACIL') {
      if (numbers.length !== 15) {
        errors.push('Selecione exatamente 15 números');
      }
      if (numbers.some(n => n < 1 || n > 25)) {
        errors.push('Números devem estar entre 1 e 25');
      }
      if (new Set(numbers).size !== numbers.length) {
        errors.push('Números devem ser únicos');
      }
    } else if (game === 'SUPERSETE') {
      if (numbers.length !== 7) {
        errors.push('Selecione exatamente 7 colunas');
      }
      if (numbers.some(n => n < 0 || n > 9)) {
        errors.push('Dígitos devem estar entre 0 e 9');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateRoundsBought: (rounds: number): boolean => {
    return Number.isInteger(rounds) && rounds >= 1 && rounds <= 6;
  },

  validatePaymentMethod: (method: string): boolean => {
    return ['ETH', 'USDC', 'wONE'].includes(method);
  }
};

// Utilitários para o estado do jogo
export const gameStateUtils = {
  calculateTicketPrice: (game: 'LOTOFACIL' | 'SUPERSETE', rounds: number): string => {
    // Preços base em USD (será convertido para token escolhido)
    const basePrices = {
      LOTOFACIL: 2.5,  // $2.50 USD
      SUPERSETE: 3.0   // $3.00 USD
    };

    const basePrice = basePrices[game];
    const totalPrice = basePrice * rounds;
    
    return totalPrice.toString();
  },

  formatSelectedNumbers: (numbers: number[], game: 'LOTOFACIL' | 'SUPERSETE'): string => {
    if (game === 'LOTOFACIL') {
      return numbers.sort((a, b) => a - b).join(' - ');
    } else {
      return numbers.join(' | ');
    }
  },

  getGameDescription: (game: 'LOTOFACIL' | 'SUPERSETE'): {
    name: string;
    description: string;
    rules: string;
    prizes: string[];
  } => {
    if (game === 'LOTOFACIL') {
      return {
        name: 'Lotofácil',
        description: 'Escolha 15 números de 1 a 25',
        rules: 'Acerte 11, 12, 13, 14 ou 15 números para ganhar',
        prizes: [
          '15 acertos: Prêmio máximo',
          '14 acertos: 20% do pool',
          '13 acertos: 10% do pool',
          '12 acertos: 5% do pool',
          '11 acertos: 2% do pool'
        ]
      };
    } else {
      return {
        name: 'SuperSete',
        description: 'Escolha 7 colunas com dígitos de 0 a 9',
        rules: 'Acerte 3, 4, 5, 6 ou 7 colunas para ganhar',
        prizes: [
          '7 acertos: Prêmio máximo',
          '6 acertos: 25% do pool',
          '5 acertos: 15% do pool',
          '4 acertos: 8% do pool',
          '3 acertos: 5% do pool'
        ]
      };
    }
  },

  generateRandomNumbers: (game: 'LOTOFACIL' | 'SUPERSETE'): number[] => {
    if (game === 'LOTOFACIL') {
      const numbers: number[] = [];
      while (numbers.length < 15) {
        const num = Math.floor(Math.random() * 25) + 1;
        if (!numbers.includes(num)) {
          numbers.push(num);
        }
      }
      return numbers.sort((a, b) => a - b);
    } else {
      const columns: number[] = [];
      for (let i = 0; i < 7; i++) {
        columns.push(Math.floor(Math.random() * 10));
      }
      return columns;
    }
  }
};

// Constantes do jogo
export const gameConstants = {
  LOTOFACIL: {
    MIN_NUMBER: 1,
    MAX_NUMBER: 25,
    SELECT_COUNT: 15,
    MIN_WINNING_NUMBERS: 11,
    MAX_ROUNDS: 6
  },
  SUPERSETE: {
    MIN_NUMBER: 0,
    MAX_NUMBER: 9,
    SELECT_COUNT: 7,
    MIN_WINNING_COLUMNS: 3,
    MAX_ROUNDS: 6
  },
  PAYMENT_METHODS: ['ETH', 'USDC', 'wONE'] as const,
  MAX_ROUNDS_BOUGHT: 6,
  MIN_ROUNDS_BOUGHT: 1
} as const;