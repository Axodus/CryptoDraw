# Backend API - CryptoDraw

## Instruções para o Copilot Agent

Este diretório implementa o backend Node.js/Express para o sistema CryptoDraw, responsável pela consolidação off-chain, indexação de eventos e API REST/GraphQL.

## Arquitetura Geral

### Stack Tecnológico
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Redis (cache)
- **Blockchain**: ethers.js v6
- **Queue**: Bull/BullMQ para jobs assíncronos
- **Monitoring**: Winston (logs) + Prometheus (metrics)
- **API**: REST + GraphQL (Apollo Server)

### Estrutura de Arquivos

```
src/
├── backend/
│   ├── controllers/          # Controladores REST
│   ├── services/            # Lógica de negócio
│   ├── models/             # Modelos de dados (compartilhados)
│   ├── utils/              # Utilitários (compartilhados)
│   ├── middleware/         # Middlewares Express
│   ├── jobs/              # Background jobs
│   ├── graphql/           # Schema e resolvers GraphQL
│   ├── config/            # Configurações
│   ├── types/             # Tipos TypeScript (compartilhados)
│   ├── prisma/            # Schema do banco
│   ├── migrations/        # Migrations SQL
│   └── tests/            # Testes do backend
├── models/                   # Modelos compartilhados entre front/backend
├── utils/                    # Utilitários compartilhados
├── services/                 # Services compartilhados (blockchain)
└── components/              # Componentes React (frontend)
```

## Funcionalidades Principais

### 1. Consolidador Off-chain
**Arquivo**: `src/backend/services/ConsolidatorService.ts`

Implementar conforme seção 6 da especificação:

```typescript
class ConsolidatorService {
    // Coleta tickets válidos após cutoff
    async collectValidTickets(drawId: number): Promise<Ticket[]>
    
    // Gera Merkle tree e root
    async generateMerkleTree(tickets: Ticket[]): Promise<{
        root: string;
        leaves: string[];
        proofs: { [ticketId: string]: string[] };
    }>
    
    // Submete consolidação ao contrato
    async submitConsolidation(drawId: number, merkleRoot: string, totalPool: string): Promise<string>
    
    // Calcula vencedores por tier
    async calculateWinners(drawId: number, winningNumbers: number[]): Promise<WinnersByTier>
}
```

### 2. Indexador de Eventos
**Arquivo**: `src/backend/services/EventIndexerService.ts`

```typescript
class EventIndexerService {
    // Escuta eventos do contrato
    async startIndexing(): Promise<void>
    
    // Processa evento TicketMinted
    async handleTicketMinted(event: TicketMintedEvent): Promise<void>
    
    // Processa evento DrawCreated
    async handleDrawCreated(event: DrawCreatedEvent): Promise<void>
    
    // Processa evento RandomnessFulfilled
    async handleRandomnessFulfilled(event: RandomnessFulfilledEvent): Promise<void>
}
```

### 3. API REST Controllers

#### 3.1 TicketController
**Arquivo**: `src/backend/controllers/TicketController.ts`

```typescript
class TicketController {
    // GET /api/tickets/:ticketId
    async getTicket(req: Request, res: Response): Promise<void>
    
    // GET /api/tickets/user/:address
    async getUserTickets(req: Request, res: Response): Promise<void>
    
    // GET /api/tickets/:ticketId/proof
    async getWinningProof(req: Request, res: Response): Promise<void>
    
    // POST /api/tickets/validate
    async validateTicketNumbers(req: Request, res: Response): Promise<void>
}
```

#### 3.2 DrawController
**Arquivo**: `src/backend/controllers/DrawController.ts`

```typescript
class DrawController {
    // GET /api/draws
    async listDraws(req: Request, res: Response): Promise<void>
    
    // GET /api/draws/:drawId
    async getDraw(req: Request, res: Response): Promise<void>
    
    // GET /api/draws/:drawId/results
    async getDrawResults(req: Request, res: Response): Promise<void>
    
    // GET /api/draws/:drawId/winners
    async getWinners(req: Request, res: Response): Promise<void>
}
```

#### 3.3 StatsController
**Arquivo**: `src/backend/controllers/StatsController.ts`

```typescript
class StatsController {
    // GET /api/stats/general
    async getGeneralStats(req: Request, res: Response): Promise<void>
    
    // GET /api/stats/game/:gameType
    async getGameStats(req: Request, res: Response): Promise<void>
    
    // GET /api/stats/frequency
    async getNumberFrequency(req: Request, res: Response): Promise<void>
}
```

### 4. Modelos de Dados

#### 4.1 Ticket Model
**Arquivo**: `src/models/Ticket.ts` (compartilhado entre frontend/backend)

```typescript
interface Ticket {
    id: string;           // ticketId on-chain
    owner: string;        // address
    game: GameType;       // LOTOFACIL | SUPERSETE
    numbers: number[];    // números escolhidos
    numbersPacked: string; // representação compacta
    roundsBought: number;
    roundsRemaining: number;
    firstDrawId: number;
    createdAt: Date;
    expirationAt: Date;
    status: TicketStatus;
    transactionHash: string;
    blockNumber: number;
}
```

#### 4.2 Draw Model
**Arquivo**: `src/models/Draw.ts` (compartilhado entre frontend/backend)

```typescript
interface Draw {
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
```

### 5. Utilitários Críticos

#### 5.1 Packing Utils
**Arquivo**: `src/utils/NumberPacking.ts` (compartilhado entre frontend/backend)

Implementar conforme seção 3 da especificação:

```typescript
export class NumberPacking {
    // Lotofácil: 15 números em 1-25 -> bitmask 25 bits
    static packLotofacil(numbers: number[]): number
    static unpackLotofacil(packed: number): number[]
    
    // SuperSete: 7 colunas 0-9 -> 28 bits
    static packSupersete(columns: number[]): number
    static unpackSupersete(packed: number): number[]
    
    // Validações
    static validateLotofasilNumbers(numbers: number[]): boolean
    static validateSuperseteNumbers(columns: number[]): boolean
}
```

#### 5.2 Merkle Utils
**Arquivo**: `src/utils/MerkleTree.ts` (compartilhado entre frontend/backend)

Implementar conforme seção 4 da especificação:

```typescript
export class MerkleTree {
    // Gera leaf hash conforme spec
    static generateLeafHash(ticket: {
        ticketId: string;
        owner: string;
        game: number;
        numbersPacked: number;
        roundsBought: number;
        firstDrawId: number;
    }): string
    
    // Constrói árvore Merkle
    static buildTree(leaves: string[]): {
        root: string;
        tree: string[][];
        proofs: { [leaf: string]: string[] };
    }
    
    // Verifica proof
    static verifyProof(leaf: string, proof: string[], root: string): boolean
}
```

#### 5.3 Randomness Utils
**Arquivo**: `src/utils/RandomnessDerivation.ts` (compartilhado entre frontend/backend)

Implementar algoritmos da seção 10:

```typescript
export class RandomnessDerivation {
    // Deriva números vencedores do Lotofácil
    static deriveLotofacilWinning(randomness: string): number[]
    
    // Deriva números vencedores do SuperSete
    static deriveSuperseteWinning(randomness: string): number[]
    
    // Converte para formato packed
    static toPackedFormat(numbers: number[], game: GameType): number
}
```

### 6. Background Jobs

#### 6.1 Draw Jobs
**Arquivo**: `src/backend/jobs/DrawJobs.ts`

```typescript
// Job executado no cutoff de cada draw
export const consolidateDrawJob = {
    name: 'consolidate-draw',
    handler: async (job: Job<{ drawId: number }>) => {
        const consolidator = new ConsolidatorService();
        await consolidator.processDrawConsolidation(job.data.drawId);
    }
};

// Job para requestar randomness após consolidação
export const requestRandomnessJob = {
    name: 'request-randomness',
    handler: async (job: Job<{ drawId: number }>) => {
        const randomnessService = new RandomnessService();
        await randomnessService.requestRandomness(job.data.drawId);
    }
};
```

#### 6.2 Monitoring Jobs
**Arquivo**: `src/backend/jobs/MonitoringJobs.ts`

```typescript
// Job para sincronizar estado com blockchain
export const syncBlockchainJob = {
    name: 'sync-blockchain',
    handler: async () => {
        const indexer = new EventIndexerService();
        await indexer.syncLatestEvents();
    }
};
```

### 7. Configurações

#### 7.1 Database Config
**Arquivo**: `src/backend/config/database.ts`

```typescript
export const databaseConfig = {
    postgres: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'cryptodraw',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
};
```

#### 7.2 Blockchain Config
**Arquivo**: `src/backend/config/blockchain.ts`

```typescript
export const blockchainConfig = {
    networks: {
        mainnet: {
            rpcUrl: process.env.MAINNET_RPC_URL,
            contractAddress: process.env.MAINNET_CONTRACT_ADDRESS,
            startBlock: parseInt(process.env.MAINNET_START_BLOCK || '0'),
        },
        goerli: {
            rpcUrl: process.env.GOERLI_RPC_URL,
            contractAddress: process.env.GOERLI_CONTRACT_ADDRESS,
            startBlock: parseInt(process.env.GOERLI_START_BLOCK || '0'),
        },
    },
    consolidator: {
        privateKey: process.env.CONSOLIDATOR_PRIVATE_KEY,
        gasLimit: process.env.GAS_LIMIT || '500000',
    }
};
```

## Schema do Banco de Dados

### Arquivo: `src/backend/prisma/schema.prisma`

```prisma
model Ticket {
  id              String      @id
  owner           String
  game            GameType
  numbers         Int[]
  numbersPacked   String
  roundsBought    Int
  roundsRemaining Int
  firstDrawId     Int
  createdAt       DateTime
  expirationAt    DateTime
  status          TicketStatus
  txHash          String
  blockNumber     BigInt
  
  draw            Draw        @relation(fields: [firstDrawId], references: [id])
  
  @@map("tickets")
}

model Draw {
  id              Int         @id
  game            GameType
  scheduledAt     DateTime
  cutoffAt        DateTime
  status          DrawStatus
  merkleRoot      String?
  totalPoolUSD    String?
  randomness      String?
  winningNumbers  Int[]
  winningPacked   String?
  ticketCount     Int         @default(0)
  
  tickets         Ticket[]
  results         DrawResult?
  
  @@map("draws")
}

enum GameType {
  LOTOFACIL
  SUPERSETE
}

enum TicketStatus {
  ACTIVE
  EXPIRED
  REDEEMED
  BURNED
}

enum DrawStatus {
  SCHEDULED
  OPEN
  CLOSED
  CONSOLIDATED
  RANDOM_REQUESTED
  RANDOM_FULFILLED
  SETTLED
}
```

## Testes Necessários

### 1. Testes Unitários
- Todos os services e utils
- Packing/unpacking de números
- Geração de Merkle trees
- Derivação de randomness

### 2. Testes de Integração
- API endpoints
- Database operations
- Blockchain interactions

### 3. Testes E2E
- Fluxo completo de draw
- Consolidação e claims
- Jobs em background

## Checklist de Implementação

- [ ] Configurar projeto TypeScript + Express
- [ ] Implementar modelos de dados
- [ ] Criar services principais
- [ ] Implementar controllers REST
- [ ] Adicionar GraphQL schema
- [ ] Implementar utilitários de packing
- [ ] Implementar Merkle tree utils
- [ ] Criar jobs de background
- [ ] Configurar database migrations
- [ ] Implementar indexador de eventos
- [ ] Adicionar testes unitários
- [ ] Configurar Docker
- [ ] Documentação da API
- [ ] Monitoring e logs