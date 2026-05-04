# Bibliotecas Compartilhadas - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém bibliotecas e utilitários compartilhados entre diferentes partes do projeto CryptoDraw (contratos, backend, frontend). Implementar código reutilizável e bem documentado.

## Estrutura das Bibliotecas

```
libs/
├── types/                 # Tipos TypeScript compartilhados
├── utils/                # Utilitários comuns
├── constants/            # Constantes e configurações
├── validation/           # Schemas de validação
├── crypto/              # Funções criptográficas
├── contracts/           # ABIs e wrappers de contratos
└── testing/             # Utilitários de teste
```

## 1. Tipos TypeScript Compartilhados

### 1.1 Core Types
**Arquivo**: `types/core.ts`

```typescript
// Game Types
export type GameType = 'LOTOFACIL' | 'SUPERSETE';

export enum Game {
    LOTOFACIL = 1,
    SUPERSETE = 2
}

// Ticket Types
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
    blockNumber?: number;
}

export enum TicketStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired', 
    REDEEMED = 'redeemed',
    BURNED = 'burned'
}

// Draw Types
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

export enum DrawStatus {
    SCHEDULED = 'scheduled',
    OPEN = 'open',
    CLOSED = 'closed',
    CONSOLIDATED = 'consolidated',
    RANDOM_REQUESTED = 'random_requested',
    RANDOM_FULFILLED = 'random_fulfilled',
    SETTLED = 'settled'
}

export interface DrawResults {
    tier1?: PrizeTier;
    tier2?: PrizeTier;
    tier3?: PrizeTier;
    tier4?: PrizeTier;
    tier5?: PrizeTier;
}

export interface PrizeTier {
    matches: number;
    winners: number;
    prizePerWinner: string;
    totalPrize: string;
}

// Pool Types
export interface Pool {
    id: string;
    creator: string;
    name: string;
    description?: string;
    game: GameType;
    targetDrawId: number;
    maxParticipants: number;
    ticketPrice: string;
    totalShares: number;
    participantCount: number;
    status: PoolStatus;
    createdAt: Date;
    finalizesAt: Date;
}

export enum PoolStatus {
    OPEN = 'open',
    CLOSED = 'closed',
    FINALIZED = 'finalized',
    SETTLED = 'settled'
}

export interface PoolParticipation {
    poolId: string;
    participant: string;
    shares: number;
    contribution: string;
    joinedAt: Date;
}

// Prize Types
export interface Prize {
    ticketId: string;
    drawId: number;
    tier: number;
    matches: number;
    amount: string;
    claimed: boolean;
    claimedAt?: Date;
    claimTxHash?: string;
}

// Statistics Types
export interface GameStatistics {
    game: GameType;
    totalDraws: number;
    totalTickets: number;
    totalPrizes: string;
    averagePool: string;
    numberFrequency: NumberFrequency;
    trends: GameTrends;
}

export interface NumberFrequency {
    [number: string]: {
        count: number;
        percentage: number;
        trend: 'hot' | 'cold' | 'neutral';
        lastDrawn?: number;
    };
}

export interface GameTrends {
    hotNumbers: number[];
    coldNumbers: number[];
    mostCommonPairs: Array<[number, number]>;
    leastCommonPairs: Array<[number, number]>;
    evenOddRatio: {
        even: number;
        odd: number;
    };
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// Event Types
export interface ContractEvent {
    eventName: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    args: any;
    timestamp: Date;
}

export interface TicketMintedEvent extends ContractEvent {
    eventName: 'TicketMinted';
    args: {
        ticketId: string;
        owner: string;
        game: number;
        firstDrawId: number;
    };
}

export interface DrawCreatedEvent extends ContractEvent {
    eventName: 'DrawCreated';
    args: {
        drawId: number;
        game: number;
        scheduledAt: number;
    };
}

export interface DrawConsolidatedEvent extends ContractEvent {
    eventName: 'DrawConsolidated';
    args: {
        drawId: number;
        merkleRoot: string;
        totalPoolUSD: string;
    };
}

export interface RandomnessFulfilledEvent extends ContractEvent {
    eventName: 'RandomnessFulfilled';
    args: {
        drawId: number;
        randomness: string;
    };
}

export interface PrizeClaimedEvent extends ContractEvent {
    eventName: 'PrizeClaimed';
    args: {
        ticketId: string;
        claimant: string;
        amount: string;
    };
}

// WebSocket Message Types
export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: Date;
}

export interface SubscribeMessage extends WebSocketMessage {
    type: 'subscribe';
    data: {
        events: string[];
        filters?: any;
    };
}

export interface EventMessage extends WebSocketMessage {
    type: 'event';
    data: ContractEvent;
}

// Configuration Types
export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    contracts: {
        cryptoDraw: string;
        ticketNFT: string;
        poolManager: string;
        priceOracle: string;
        randomnessProvider: string;
    };
    explorer: {
        name: string;
        url: string;
    };
}

export interface AppConfig {
    networks: {
        [key: string]: NetworkConfig;
    };
    api: {
        baseUrl: string;
        wsUrl: string;
        timeout: number;
    };
    features: {
        pools: boolean;
        statistics: boolean;
        notifications: boolean;
    };
}
```

### 1.2 Utility Types
**Arquivo**: `types/utils.ts`

```typescript
// Helper utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredOnly<T, K extends keyof T> = Required<Pick<T, K>> & Partial<Omit<T, K>>;

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

// Contract interaction types
export interface ContractCall {
    address: string;
    abi: any[];
    functionName: string;
    args: any[];
}

export interface ContractTransaction extends ContractCall {
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
}

export interface TransactionReceipt {
    hash: string;
    blockNumber: number;
    blockHash: string;
    gasUsed: string;
    status: 'success' | 'failed';
    events: ContractEvent[];
}

// Validation types
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    code: string;
    message: string;
    value?: any;
}

// Merkle proof types
export interface MerkleProof {
    leaf: string;
    proof: string[];
    root: string;
    verified: boolean;
}

export interface MerkleTree {
    root: string;
    leaves: string[];
    proofs: { [leaf: string]: string[] };
}

// Price types
export interface PriceData {
    token: string;
    priceUSD: number;
    change24h: number;
    lastUpdated: Date;
}

export interface ConversionResult {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    rate: number;
    timestamp: Date;
}
```

## 2. Utilitários Comuns

### 2.1 Number Packing Utilities
**Arquivo**: `utils/numberPacking.ts`

```typescript
import { GameType } from '../types/core';

/**
 * Utility class for packing and unpacking lottery numbers
 * according to the CryptoDraw specification
 */
export class NumberPacking {
    /**
     * Pack Lotofácil numbers (15 numbers from 1-25) into a bitmask
     */
    static packLotofacil(numbers: number[]): number {
        if (!this.validateLotofasilNumbers(numbers)) {
            throw new Error('Invalid Lotofácil numbers');
        }

        return numbers.reduce((bitmask, num) => {
            return bitmask | (1 << (num - 1));
        }, 0);
    }

    /**
     * Unpack Lotofácil bitmask back to numbers array
     */
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
     * Pack SuperSete columns (7 digits from 0-9) into 28 bits
     */
    static packSupersete(columns: number[]): number {
        if (!this.validateSuperseteNumbers(columns)) {
            throw new Error('Invalid SuperSete columns');
        }

        return columns.reduce((packed, digit, index) => {
            return packed | (digit << (index * 4));
        }, 0);
    }

    /**
     * Unpack SuperSete packed value back to columns array
     */
    static unpackSupersete(packed: number): number[] {
        const columns: number[] = [];
        
        for (let i = 0; i < 7; i++) {
            const digit = (packed >> (i * 4)) & 0xF;
            columns.push(digit);
        }
        
        return columns;
    }

    /**
     * Pack numbers based on game type
     */
    static packNumbers(numbers: number[], game: GameType): number {
        switch (game) {
            case 'LOTOFACIL':
                return this.packLotofacil(numbers);
            case 'SUPERSETE':
                return this.packSupersete(numbers);
            default:
                throw new Error(`Unsupported game type: ${game}`);
        }
    }

    /**
     * Unpack numbers based on game type
     */
    static unpackNumbers(packed: number, game: GameType): number[] {
        switch (game) {
            case 'LOTOFACIL':
                return this.unpackLotofacil(packed);
            case 'SUPERSETE':
                return this.unpackSupersete(packed);
            default:
                throw new Error(`Unsupported game type: ${game}`);
        }
    }

    /**
     * Validate Lotofácil number selection
     */
    static validateLotofasilNumbers(numbers: number[]): boolean {
        // Must have exactly 15 numbers
        if (numbers.length !== 15) return false;

        // All numbers must be between 1 and 25
        if (!numbers.every(n => n >= 1 && n <= 25)) return false;

        // Numbers must be unique
        const uniqueNumbers = new Set(numbers);
        if (uniqueNumbers.size !== numbers.length) return false;

        return true;
    }

    /**
     * Validate SuperSete column selection
     */
    static validateSuperseteNumbers(columns: number[]): boolean {
        // Must have exactly 7 columns
        if (columns.length !== 7) return false;

        // All digits must be between 0 and 9
        if (!columns.every(d => d >= 0 && d <= 9)) return false;

        return true;
    }

    /**
     * Generate random valid numbers for a game
     */
    static generateRandomNumbers(game: GameType): number[] {
        switch (game) {
            case 'LOTOFACIL':
                return this.generateRandomLotofacil();
            case 'SUPERSETE':
                return this.generateRandomSupersete();
            default:
                throw new Error(`Unsupported game type: ${game}`);
        }
    }

    private static generateRandomLotofacil(): number[] {
        const numbers = new Set<number>();
        
        while (numbers.size < 15) {
            const num = Math.floor(Math.random() * 25) + 1;
            numbers.add(num);
        }
        
        return Array.from(numbers).sort((a, b) => a - b);
    }

    private static generateRandomSupersete(): number[] {
        return Array.from({ length: 7 }, () => Math.floor(Math.random() * 10));
    }
}
```

### 2.2 Merkle Tree Utilities
**Arquivo**: `utils/merkleTree.ts`

```typescript
import { keccak256 } from 'ethers';
import { MerkleTree as MerkleTreeType, MerkleProof } from '../types/utils';
import { Ticket } from '../types/core';

/**
 * Merkle Tree implementation for CryptoDraw ticket consolidation
 */
export class MerkleTree {
    /**
     * Generate leaf hash for a ticket according to CryptoDraw spec
     */
    static generateLeafHash(ticket: {
        ticketId: string;
        owner: string;
        game: number;
        numbersPacked: number;
        roundsBought: number;
        firstDrawId: number;
    }): string {
        // Pack data according to abi.encodePacked format
        const packed = this.abiEncodePacked(
            ['uint256', 'address', 'uint8', 'uint32', 'uint8', 'uint32'],
            [
                ticket.ticketId,
                ticket.owner,
                ticket.game,
                ticket.numbersPacked,
                ticket.roundsBought,
                ticket.firstDrawId
            ]
        );
        
        return keccak256(packed);
    }

    /**
     * Build Merkle tree from ticket leaves
     */
    static buildTree(tickets: Ticket[]): MerkleTreeType {
        const leaves = tickets.map(ticket => 
            this.generateLeafHash({
                ticketId: ticket.id,
                owner: ticket.owner,
                game: ticket.game === 'LOTOFACIL' ? 1 : 2,
                numbersPacked: parseInt(ticket.numbersPacked, 16),
                roundsBought: ticket.roundsBought,
                firstDrawId: ticket.firstDrawId
            })
        );

        const tree = this.buildMerkleTree(leaves);
        const proofs: { [leaf: string]: string[] } = {};

        // Generate proofs for each leaf
        leaves.forEach((leaf, index) => {
            proofs[leaf] = this.generateProof(tree, index);
        });

        return {
            root: tree[tree.length - 1][0],
            leaves,
            proofs
        };
    }

    /**
     * Verify a Merkle proof
     */
    static verifyProof(leaf: string, proof: string[], root: string): boolean {
        let computedHash = leaf;

        for (const proofElement of proof) {
            // Sort to ensure deterministic ordering
            if (computedHash <= proofElement) {
                computedHash = keccak256(computedHash + proofElement.slice(2));
            } else {
                computedHash = keccak256(proofElement + computedHash.slice(2));
            }
        }

        return computedHash === root;
    }

    /**
     * Build the complete Merkle tree structure
     */
    private static buildMerkleTree(leaves: string[]): string[][] {
        if (leaves.length === 0) {
            throw new Error('Cannot build tree with no leaves');
        }

        const tree: string[][] = [leaves];
        let currentLevel = leaves;

        while (currentLevel.length > 1) {
            const nextLevel: string[] = [];
            
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                
                // Sort to ensure deterministic ordering
                const hash = left <= right 
                    ? keccak256(left + right.slice(2))
                    : keccak256(right + left.slice(2));
                    
                nextLevel.push(hash);
            }
            
            tree.push(nextLevel);
            currentLevel = nextLevel;
        }

        return tree;
    }

    /**
     * Generate proof for a leaf at given index
     */
    private static generateProof(tree: string[][], leafIndex: number): string[] {
        const proof: string[] = [];
        let index = leafIndex;

        for (let level = 0; level < tree.length - 1; level++) {
            const isRightNode = index % 2 === 1;
            const siblingIndex = isRightNode ? index - 1 : index + 1;
            
            if (siblingIndex < tree[level].length) {
                proof.push(tree[level][siblingIndex]);
            }
            
            index = Math.floor(index / 2);
        }

        return proof;
    }

    /**
     * Simplified abi.encodePacked implementation
     */
    private static abiEncodePacked(types: string[], values: any[]): string {
        let result = '0x';
        
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const value = values[i];
            
            switch (type) {
                case 'uint256':
                    result += BigInt(value).toString(16).padStart(64, '0');
                    break;
                case 'address':
                    result += value.slice(2).toLowerCase();
                    break;
                case 'uint8':
                    result += Number(value).toString(16).padStart(2, '0');
                    break;
                case 'uint32':
                    result += Number(value).toString(16).padStart(8, '0');
                    break;
                default:
                    throw new Error(`Unsupported type: ${type}`);
            }
        }
        
        return result;
    }
}
```

### 2.3 Format Utilities
**Arquivo**: `utils/format.ts`

```typescript
/**
 * Formatting utilities for CryptoDraw application
 */
export class Format {
    /**
     * Format ETH amount with proper decimals
     */
    static eth(amount: string | number, decimals: number = 4): string {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${num.toFixed(decimals)} ETH`;
    }

    /**
     * Format USD amount
     */
    static usd(amount: string | number): string {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    }

    /**
     * Format number with thousands separator
     */
    static number(num: number, decimals: number = 0): string {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }

    /**
     * Format percentage
     */
    static percentage(value: number, decimals: number = 1): string {
        return `${(value * 100).toFixed(decimals)}%`;
    }

    /**
     * Format lottery numbers for display
     */
    static lotteryNumbers(numbers: number[], game: 'LOTOFACIL' | 'SUPERSETE'): string {
        if (game === 'LOTOFACIL') {
            return numbers.sort((a, b) => a - b).join(' - ');
        } else {
            return numbers.join(' ');
        }
    }

    /**
     * Format address for display (truncated)
     */
    static address(address: string, chars: number = 6): string {
        if (address.length <= chars * 2 + 2) return address;
        return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
    }

    /**
     * Format transaction hash
     */
    static txHash(hash: string, chars: number = 8): string {
        return this.address(hash, chars);
    }

    /**
     * Format date for display
     */
    static date(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static relativeTime(date: Date | string): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return this.date(d);
    }

    /**
     * Format duration in seconds to human readable
     */
    static duration(seconds: number): string {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts: string[] = [];
        
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }

    /**
     * Format file size in bytes to human readable
     */
    static fileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Truncate text with ellipsis
     */
    static truncate(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
    }
}
```

### 2.4 Validation Utilities
**Arquivo**: `utils/validation.ts`

```typescript
import { ValidationResult, ValidationError } from '../types/utils';
import { GameType } from '../types/core';

/**
 * Validation utilities for CryptoDraw
 */
export class Validation {
    /**
     * Validate Ethereum address
     */
    static isValidAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Validate transaction hash
     */
    static isValidTxHash(hash: string): boolean {
        return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }

    /**
     * Validate lottery numbers based on game type
     */
    static validateLotteryNumbers(numbers: number[], game: GameType): ValidationResult {
        const errors: ValidationError[] = [];

        if (game === 'LOTOFACIL') {
            // Must have exactly 15 numbers
            if (numbers.length !== 15) {
                errors.push({
                    field: 'numbers',
                    code: 'INVALID_COUNT',
                    message: 'Lotofácil requires exactly 15 numbers',
                    value: numbers.length
                });
            }

            // Numbers must be between 1 and 25
            const invalidNumbers = numbers.filter(n => n < 1 || n > 25);
            if (invalidNumbers.length > 0) {
                errors.push({
                    field: 'numbers',
                    code: 'INVALID_RANGE',
                    message: 'Numbers must be between 1 and 25',
                    value: invalidNumbers
                });
            }

            // Numbers must be unique
            const uniqueNumbers = new Set(numbers);
            if (uniqueNumbers.size !== numbers.length) {
                errors.push({
                    field: 'numbers',
                    code: 'DUPLICATE_NUMBERS',
                    message: 'Numbers must be unique',
                    value: numbers
                });
            }
        } else if (game === 'SUPERSETE') {
            // Must have exactly 7 columns
            if (numbers.length !== 7) {
                errors.push({
                    field: 'numbers',
                    code: 'INVALID_COUNT',
                    message: 'SuperSete requires exactly 7 columns',
                    value: numbers.length
                });
            }

            // Digits must be between 0 and 9
            const invalidDigits = numbers.filter(d => d < 0 || d > 9);
            if (invalidDigits.length > 0) {
                errors.push({
                    field: 'numbers',
                    code: 'INVALID_RANGE',
                    message: 'Digits must be between 0 and 9',
                    value: invalidDigits
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate rounds count
     */
    static validateRounds(rounds: number): ValidationResult {
        const errors: ValidationError[] = [];

        if (!Number.isInteger(rounds)) {
            errors.push({
                field: 'rounds',
                code: 'INVALID_TYPE',
                message: 'Rounds must be an integer',
                value: rounds
            });
        } else if (rounds < 1 || rounds > 6) {
            errors.push({
                field: 'rounds',
                code: 'INVALID_RANGE',
                message: 'Rounds must be between 1 and 6',
                value: rounds
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate ETH amount
     */
    static validateEthAmount(amount: string): ValidationResult {
        const errors: ValidationError[] = [];

        try {
            const num = parseFloat(amount);
            
            if (isNaN(num)) {
                errors.push({
                    field: 'amount',
                    code: 'INVALID_NUMBER',
                    message: 'Amount must be a valid number',
                    value: amount
                });
            } else if (num <= 0) {
                errors.push({
                    field: 'amount',
                    code: 'INVALID_RANGE',
                    message: 'Amount must be greater than 0',
                    value: num
                });
            } else if (num > 100) { // Reasonable upper limit
                errors.push({
                    field: 'amount',
                    code: 'AMOUNT_TOO_HIGH',
                    message: 'Amount is too high',
                    value: num
                });
            }
        } catch (error) {
            errors.push({
                field: 'amount',
                code: 'PARSE_ERROR',
                message: 'Failed to parse amount',
                value: amount
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email address
     */
    static validateEmail(email: string): ValidationResult {
        const errors: ValidationError[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            errors.push({
                field: 'email',
                code: 'INVALID_FORMAT',
                message: 'Invalid email format',
                value: email
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate URL
     */
    static validateUrl(url: string): ValidationResult {
        const errors: ValidationError[] = [];

        try {
            new URL(url);
        } catch {
            errors.push({
                field: 'url',
                code: 'INVALID_URL',
                message: 'Invalid URL format',
                value: url
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Combine multiple validation results
     */
    static combine(...results: ValidationResult[]): ValidationResult {
        const allErrors = results.flatMap(r => r.errors);
        
        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }

    /**
     * Validate object against schema
     */
    static validateSchema<T>(obj: any, schema: ValidationSchema<T>): ValidationResult {
        const errors: ValidationError[] = [];

        for (const [field, validator] of Object.entries(schema)) {
            const value = obj[field];
            const result = validator(value);
            
            if (!result.isValid) {
                errors.push(...result.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

type ValidationSchema<T> = {
    [K in keyof T]: (value: any) => ValidationResult;
};
```

## 3. Constantes e Configurações

### 3.1 Game Constants
**Arquivo**: `constants/games.ts`

```typescript
import { GameType } from '../types/core';

export const GAME_CONFIG = {
    LOTOFACIL: {
        id: 1,
        name: 'Lotofácil',
        description: 'Escolha 15 números de 1 a 25',
        minNumbers: 15,
        maxNumbers: 15,
        numberRange: { min: 1, max: 25 },
        drawFrequency: 'daily',
        drawTime: '20:00',
        prizeTiers: [
            { matches: 15, percentage: 50 },
            { matches: 14, percentage: 20 },
            { matches: 13, percentage: 15 },
            { matches: 12, percentage: 10 },
            { matches: 11, percentage: 5 }
        ]
    },
    SUPERSETE: {
        id: 2,
        name: 'SuperSete',
        description: 'Escolha 1 dígito para cada uma das 7 colunas',
        minNumbers: 7,
        maxNumbers: 7,
        numberRange: { min: 0, max: 9 },
        drawFrequency: 'weekly',
        drawTime: '20:00',
        prizeTiers: [
            { matches: 7, percentage: 40 },
            { matches: 6, percentage: 25 },
            { matches: 5, percentage: 20 },
            { matches: 4, percentage: 10 },
            { matches: 3, percentage: 5 }
        ]
    }
} as const;

export const ROUNDS_CONFIG = {
    MIN_ROUNDS: 1,
    MAX_ROUNDS: 6,
    DEFAULT_ROUNDS: 1
} as const;

export const TICKET_CONFIG = {
    EXPIRY_DAYS: 14,
    CUTOFF_HOURS: 3,
    MIN_PRICE_USD: 1,
    MAX_PRICE_USD: 100
} as const;

export const POOL_CONFIG = {
    MIN_PARTICIPANTS: 2,
    MAX_PARTICIPANTS: 100,
    MIN_CONTRIBUTION: '0.01', // ETH
    MAX_CONTRIBUTION: '10' // ETH
} as const;
```

### 3.2 Network Constants
**Arquivo**: `constants/networks.ts`

```typescript
import { NetworkConfig } from '../types/core';

export const NETWORKS: Record<string, NetworkConfig> = {
    mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
        contracts: {
            cryptoDraw: '0x...',
            ticketNFT: '0x...',
            poolManager: '0x...',
            priceOracle: '0x...',
            randomnessProvider: '0x...'
        },
        explorer: {
            name: 'Etherscan',
            url: 'https://etherscan.io'
        }
    },
    goerli: {
        name: 'Goerli Testnet',
        chainId: 5,
        rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY',
        contracts: {
            cryptoDraw: '0x...',
            ticketNFT: '0x...',
            poolManager: '0x...',
            priceOracle: '0x...',
            randomnessProvider: '0x...'
        },
        explorer: {
            name: 'Goerli Etherscan',
            url: 'https://goerli.etherscan.io'
        }
    }
} as const;

export const DEFAULT_NETWORK = 'goerli';

export const SUPPORTED_CHAINS = [1, 5] as const;
```

### 3.3 Error Constants
**Arquivo**: `constants/errors.ts`

```typescript
export const ERROR_CODES = {
    // Validation errors
    INVALID_NUMBERS: 'INVALID_NUMBERS',
    INVALID_ROUNDS: 'INVALID_ROUNDS',
    INVALID_ADDRESS: 'INVALID_ADDRESS',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    
    // Contract errors
    DRAW_CLOSED: 'DRAW_CLOSED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
    ALREADY_CLAIMED: 'ALREADY_CLAIMED',
    INVALID_PROOF: 'INVALID_PROOF',
    
    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    
    // API errors
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    
    // Internal errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

export const ERROR_MESSAGES = {
    [ERROR_CODES.INVALID_NUMBERS]: 'Invalid number selection',
    [ERROR_CODES.INVALID_ROUNDS]: 'Invalid number of rounds',
    [ERROR_CODES.INVALID_ADDRESS]: 'Invalid Ethereum address',
    [ERROR_CODES.INVALID_AMOUNT]: 'Invalid amount',
    [ERROR_CODES.DRAW_CLOSED]: 'Draw is closed for new entries',
    [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds',
    [ERROR_CODES.TICKET_NOT_FOUND]: 'Ticket not found',
    [ERROR_CODES.ALREADY_CLAIMED]: 'Prize already claimed',
    [ERROR_CODES.INVALID_PROOF]: 'Invalid Merkle proof',
    [ERROR_CODES.NETWORK_ERROR]: 'Network connection error',
    [ERROR_CODES.UNSUPPORTED_NETWORK]: 'Unsupported network',
    [ERROR_CODES.CONNECTION_FAILED]: 'Failed to connect to network',
    [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
    [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
    [ERROR_CODES.NOT_FOUND]: 'Resource not found',
    [ERROR_CODES.RATE_LIMITED]: 'Rate limit exceeded',
    [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
    [ERROR_CODES.CONFIGURATION_ERROR]: 'Configuration error'
} as const;
```

## 4. Schemas de Validação

### 4.1 Zod Schemas
**Arquivo**: `validation/schemas.ts`

```typescript
import { z } from 'zod';
import { GameType, TicketStatus, DrawStatus, PoolStatus } from '../types/core';

// Game schemas
export const gameTypeSchema = z.enum(['LOTOFACIL', 'SUPERSETE']);

export const lotofasilNumbersSchema = z.array(z.number().min(1).max(25))
    .length(15)
    .refine(arr => new Set(arr).size === arr.length, {
        message: 'Numbers must be unique'
    });

export const superseteNumbersSchema = z.array(z.number().min(0).max(9))
    .length(7);

// Ticket schemas
export const buyTicketSchema = z.object({
    game: gameTypeSchema,
    numbers: z.union([lotofasilNumbersSchema, superseteNumbersSchema]),
    rounds: z.number().min(1).max(6),
    drawId: z.number().positive(),
    maxPayment: z.string().regex(/^\d+(\.\d+)?$/)
}).refine(data => {
    if (data.game === 'LOTOFACIL') {
        return data.numbers.length === 15;
    } else {
        return data.numbers.length === 7;
    }
}, {
    message: 'Number count must match game type'
});

export const ticketSchema = z.object({
    id: z.string(),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    game: gameTypeSchema,
    numbers: z.array(z.number()),
    numbersPacked: z.string().regex(/^0x[a-fA-F0-9]+$/),
    roundsBought: z.number().min(1).max(6),
    roundsRemaining: z.number().min(0).max(6),
    firstDrawId: z.number().positive(),
    createdAt: z.date(),
    expirationAt: z.date(),
    status: z.enum(['active', 'expired', 'redeemed', 'burned']),
    transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

// Draw schemas
export const drawSchema = z.object({
    id: z.number().positive(),
    game: gameTypeSchema,
    scheduledAt: z.date(),
    cutoffAt: z.date(),
    status: z.enum(['scheduled', 'open', 'closed', 'consolidated', 'random_requested', 'random_fulfilled', 'settled']),
    merkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    totalPoolUSD: z.string().optional(),
    randomness: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    winningNumbers: z.array(z.number()).optional(),
    winningPacked: z.string().optional(),
    ticketCount: z.number().nonnegative()
});

// Pool schemas
export const createPoolSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
    game: gameTypeSchema,
    targetDrawId: z.number().positive(),
    maxParticipants: z.number().min(2).max(100),
    ticketPrice: z.string().regex(/^\d+(\.\d+)?$/)
});

export const joinPoolSchema = z.object({
    poolId: z.string(),
    shares: z.number().positive(),
    contribution: z.string().regex(/^\d+(\.\d+)?$/)
});

// API schemas
export const paginationSchema = z.object({
    page: z.number().positive().default(1),
    limit: z.number().min(1).max(100).default(20)
});

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum address'
});

export const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
    message: 'Invalid transaction hash'
});

// Query parameter schemas
export const getUserTicketsSchema = z.object({
    address: addressSchema,
    status: z.enum(['active', 'expired', 'redeemed', 'burned']).optional(),
    game: gameTypeSchema.optional(),
    ...paginationSchema.shape
});

export const getDrawsSchema = z.object({
    game: gameTypeSchema.optional(),
    status: z.enum(['scheduled', 'open', 'closed', 'consolidated', 'random_requested', 'random_fulfilled', 'settled']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    ...paginationSchema.shape
});
```

## 5. Utilitários de Teste

### 5.1 Test Helpers
**Arquivo**: `testing/helpers.ts`

```typescript
import { Ticket, Draw, Pool } from '../types/core';
import { NumberPacking } from '../utils/numberPacking';

/**
 * Test utilities for CryptoDraw
 */
export class TestHelpers {
    /**
     * Generate mock ticket data
     */
    static createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
        const defaultTicket: Ticket = {
            id: '1',
            owner: '0x1234567890123456789012345678901234567890',
            game: 'LOTOFACIL',
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            numbersPacked: '0x1FFFFFF',
            roundsBought: 1,
            roundsRemaining: 1,
            firstDrawId: 1,
            createdAt: new Date('2023-10-01T10:00:00Z'),
            expirationAt: new Date('2023-10-15T10:00:00Z'),
            status: 'active',
            transactionHash: '0x' + 'a'.repeat(64)
        };

        return { ...defaultTicket, ...overrides };
    }

    /**
     * Generate mock draw data
     */
    static createMockDraw(overrides: Partial<Draw> = {}): Draw {
        const defaultDraw: Draw = {
            id: 1,
            game: 'LOTOFACIL',
            scheduledAt: new Date('2023-10-01T20:00:00Z'),
            cutoffAt: new Date('2023-10-01T17:00:00Z'),
            status: 'open',
            ticketCount: 0
        };

        return { ...defaultDraw, ...overrides };
    }

    /**
     * Generate mock pool data
     */
    static createMockPool(overrides: Partial<Pool> = {}): Pool {
        const defaultPool: Pool = {
            id: '1',
            creator: '0x1234567890123456789012345678901234567890',
            name: 'Test Pool',
            game: 'LOTOFACIL',
            targetDrawId: 1,
            maxParticipants: 10,
            ticketPrice: '0.05',
            totalShares: 0,
            participantCount: 0,
            status: 'open',
            createdAt: new Date('2023-10-01T10:00:00Z'),
            finalizesAt: new Date('2023-10-01T16:00:00Z')
        };

        return { ...defaultPool, ...overrides };
    }

    /**
     * Generate random valid lottery numbers
     */
    static generateRandomNumbers(game: 'LOTOFACIL' | 'SUPERSETE'): number[] {
        return NumberPacking.generateRandomNumbers(game);
    }

    /**
     * Calculate matches between two number sets
     */
    static calculateMatches(selected: number[], winning: number[]): number {
        return selected.filter(num => winning.includes(num)).length;
    }

    /**
     * Generate winning ticket for testing
     */
    static createWinningTicket(drawId: number, winningNumbers: number[], tier: number = 1): Ticket {
        let ticketNumbers: number[];
        
        if (tier === 1) {
            // Perfect match
            ticketNumbers = [...winningNumbers];
        } else {
            // Partial match based on tier
            const matchCount = winningNumbers.length - tier + 1;
            ticketNumbers = [
                ...winningNumbers.slice(0, matchCount),
                ...this.generateRandomNumbers('LOTOFACIL').slice(matchCount)
            ].slice(0, 15);
        }

        return this.createMockTicket({
            numbers: ticketNumbers,
            numbersPacked: `0x${NumberPacking.packLotofacil(ticketNumbers).toString(16)}`,
            firstDrawId: drawId
        });
    }

    /**
     * Wait for a specified time (for async tests)
     */
    static async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate mock Ethereum address
     */
    static generateAddress(): string {
        return '0x' + Array.from({ length: 40 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    /**
     * Generate mock transaction hash
     */
    static generateTxHash(): string {
        return '0x' + Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    /**
     * Create deterministic data for reproducible tests
     */
    static createDeterministicTicket(id: number): Ticket {
        const numbers = Array.from({ length: 15 }, (_, i) => (i + id) % 25 + 1)
            .filter((num, index, arr) => arr.indexOf(num) === index)
            .slice(0, 15);

        return this.createMockTicket({
            id: id.toString(),
            owner: this.generateAddress(),
            numbers,
            numbersPacked: `0x${NumberPacking.packLotofacil(numbers).toString(16)}`
        });
    }
}
```

### 5.2 Mock Provider
**Arquivo**: `testing/mockProvider.ts`

```typescript
import { EventEmitter } from 'events';
import { TestHelpers } from './helpers';
import { Ticket, Draw } from '../types/core';

/**
 * Mock blockchain provider for testing
 */
export class MockBlockchainProvider extends EventEmitter {
    private tickets = new Map<string, Ticket>();
    private draws = new Map<number, Draw>();
    private blockNumber = 1000000;

    /**
     * Simulate buying a ticket
     */
    async buyTicket(params: {
        game: 'LOTOFACIL' | 'SUPERSETE';
        numbers: number[];
        rounds: number;
        drawId: number;
    }): Promise<string> {
        const ticketId = (this.tickets.size + 1).toString();
        const ticket = TestHelpers.createMockTicket({
            id: ticketId,
            game: params.game,
            numbers: params.numbers,
            roundsBought: params.rounds,
            firstDrawId: params.drawId,
            transactionHash: TestHelpers.generateTxHash()
        });

        this.tickets.set(ticketId, ticket);
        
        // Emit event
        this.emit('TicketMinted', {
            ticketId,
            owner: ticket.owner,
            game: params.game === 'LOTOFACIL' ? 1 : 2,
            firstDrawId: params.drawId
        });

        return ticket.transactionHash;
    }

    /**
     * Get ticket by ID
     */
    async getTicket(ticketId: string): Promise<Ticket | null> {
        return this.tickets.get(ticketId) || null;
    }

    /**
     * Get tickets by owner
     */
    async getTicketsByOwner(owner: string): Promise<Ticket[]> {
        return Array.from(this.tickets.values())
            .filter(ticket => ticket.owner === owner);
    }

    /**
     * Create a draw
     */
    async createDraw(game: 'LOTOFACIL' | 'SUPERSETE', scheduledAt: Date): Promise<number> {
        const drawId = this.draws.size + 1;
        const draw = TestHelpers.createMockDraw({
            id: drawId,
            game,
            scheduledAt,
            cutoffAt: new Date(scheduledAt.getTime() - 3 * 60 * 60 * 1000) // 3 hours before
        });

        this.draws.set(drawId, draw);
        
        this.emit('DrawCreated', {
            drawId,
            game: game === 'LOTOFACIL' ? 1 : 2,
            scheduledAt: Math.floor(scheduledAt.getTime() / 1000)
        });

        return drawId;
    }

    /**
     * Get draw by ID
     */
    async getDraw(drawId: number): Promise<Draw | null> {
        return this.draws.get(drawId) || null;
    }

    /**
     * Simulate draw consolidation
     */
    async consolidateDraw(drawId: number, merkleRoot: string, totalPool: string): Promise<void> {
        const draw = this.draws.get(drawId);
        if (!draw) throw new Error('Draw not found');

        draw.status = 'consolidated';
        draw.merkleRoot = merkleRoot;
        draw.totalPoolUSD = totalPool;

        this.emit('DrawConsolidated', {
            drawId,
            merkleRoot,
            totalPoolUSD: totalPool
        });
    }

    /**
     * Simulate randomness fulfillment
     */
    async fulfillRandomness(drawId: number, randomness: string): Promise<void> {
        const draw = this.draws.get(drawId);
        if (!draw) throw new Error('Draw not found');

        draw.status = 'random_fulfilled';
        draw.randomness = randomness;
        
        // Generate winning numbers deterministically from randomness
        draw.winningNumbers = this.generateWinningNumbers(draw.game, randomness);

        this.emit('RandomnessFulfilled', {
            drawId,
            randomness
        });
    }

    /**
     * Simulate prize claim
     */
    async claimPrize(ticketId: string, merkleProof: string[]): Promise<string> {
        const ticket = this.tickets.get(ticketId);
        if (!ticket) throw new Error('Ticket not found');

        ticket.status = 'redeemed';
        
        const txHash = TestHelpers.generateTxHash();
        
        this.emit('PrizeClaimed', {
            ticketId,
            claimant: ticket.owner,
            amount: '1000000000000000000' // 1 ETH
        });

        return txHash;
    }

    /**
     * Get current block number
     */
    async getBlockNumber(): Promise<number> {
        return this.blockNumber;
    }

    /**
     * Advance block number (for testing)
     */
    advanceBlock(): void {
        this.blockNumber++;
    }

    /**
     * Reset state (for test cleanup)
     */
    reset(): void {
        this.tickets.clear();
        this.draws.clear();
        this.blockNumber = 1000000;
        this.removeAllListeners();
    }

    private generateWinningNumbers(game: 'LOTOFACIL' | 'SUPERSETE', randomness: string): number[] {
        // Simple deterministic number generation for testing
        const seed = parseInt(randomness.slice(2, 10), 16);
        const random = () => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        if (game === 'LOTOFACIL') {
            const numbers = new Set<number>();
            while (numbers.size < 15) {
                const num = Math.floor(random() * 25) + 1;
                numbers.add(num);
            }
            return Array.from(numbers).sort((a, b) => a - b);
        } else {
            return Array.from({ length: 7 }, () => Math.floor(random() * 10));
        }
    }
}
```

## Checklist de Implementação das Bibliotecas

### Tipos TypeScript
- [ ] Core types (Ticket, Draw, Pool, etc.)
- [ ] Utility types (ValidationResult, MerkleProof, etc.)
- [ ] Event types (ContractEvent, WebSocketMessage, etc.)
- [ ] API types (ApiResponse, PaginatedResponse, etc.)
- [ ] Configuration types (NetworkConfig, AppConfig, etc.)

### Utilitários
- [ ] NumberPacking (pack/unpack para ambos jogos)
- [ ] MerkleTree (geração e verificação de proofs)
- [ ] Format (formatação de valores e datas)
- [ ] Validation (validação de inputs e dados)
- [ ] Crypto utilities (hashing, encoding)

### Constantes
- [ ] Game configurations
- [ ] Network configurations  
- [ ] Error codes e messages
- [ ] Default values
- [ ] Contract addresses

### Validação
- [ ] Zod schemas para todos os tipos
- [ ] Validation functions
- [ ] Error handling
- [ ] Type guards
- [ ] Runtime type checking

### Testing Utilities
- [ ] Mock data generators
- [ ] Test helpers
- [ ] Mock providers
- [ ] Assertion utilities
- [ ] Test fixtures

### Documentação
- [ ] JSDoc comments para todas as funções
- [ ] Usage examples
- [ ] Type documentation
- [ ] Migration guides
- [ ] Best practices guide