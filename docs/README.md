# Documentação - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém toda a documentação técnica, guias de usuário e especificações do projeto CryptoDraw. Criar documentação abrangente e bem estruturada para desenvolvedores, usuários e auditores.

## Estrutura da Documentação

```
docs/
├── api/                    # Documentação da API
├── contracts/             # Documentação dos contratos
├── user-guide/           # Guias do usuário
├── developer/            # Guias para desenvolvedores
├── architecture/         # Arquitetura do sistema
├── security/             # Documentação de segurança
└── deployment/           # Guias de deployment
```

## 1. Documentação da API

### 1.1 API Reference
**Arquivo**: `api/reference.md`

```markdown
# CryptoDraw API Reference

## Autenticação

A API CryptoDraw utiliza autenticação baseada em assinatura de mensagem para operações que requerem identificação do usuário.

### Endpoints Públicos
- Não requerem autenticação
- Rate limit: 100 requests/minuto por IP

### Endpoints Autenticados  
- Requerem assinatura de wallet
- Rate limit: 1000 requests/minuto por usuário

## Tickets

### GET /api/tickets/user/:address

Retorna todos os tickets de um usuário.

**Parâmetros:**
- `address` (string): Endereço da wallet do usuário

**Query Parameters:**
- `status` (string, opcional): Filtro por status (`active`, `expired`, `redeemed`)
- `game` (number, opcional): Filtro por jogo (1=Lotofácil, 2=SuperSete)
- `page` (number, opcional): Página (default: 1)
- `limit` (number, opcional): Itens por página (default: 20, max: 100)

**Response:**
```json
{
  "tickets": [
    {
      "id": "1",
      "owner": "0x123...",
      "game": 1,
      "numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      "numbersPacked": "0x1FFFFFF",
      "roundsBought": 3,
      "roundsRemaining": 2,
      "firstDrawId": 100,
      "createdAt": "2023-10-01T10:00:00Z",
      "expirationAt": "2023-12-01T10:00:00Z",
      "status": "active",
      "transactionHash": "0xabc123..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

**Error Responses:**
- `400 Bad Request`: Endereço inválido
- `404 Not Found`: Usuário não encontrado
- `429 Too Many Requests`: Rate limit excedido

### GET /api/tickets/:ticketId

Retorna detalhes de um ticket específico.

**Parâmetros:**
- `ticketId` (string): ID do ticket

**Response:**
```json
{
  "id": "1",
  "owner": "0x123...",
  "game": 1,
  "numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "draws": [
    {
      "drawId": 100,
      "scheduledAt": "2023-10-01T20:00:00Z",
      "status": "settled",
      "winningNumbers": [1, 2, 3, 5, 7, 11, 13, 17, 19, 21, 23, 24, 25, 4, 6],
      "matches": 11,
      "tier": 3,
      "prizeAmount": "0.05"
    }
  ],
  "totalWinnings": "0.15",
  "claimableAmount": "0.10"
}
```

### GET /api/tickets/:ticketId/proof

Retorna prova Merkle para claim de prêmio (apenas para tickets vencedores).

**Parâmetros:**
- `ticketId` (string): ID do ticket

**Response:**
```json
{
  "ticketId": "1",
  "drawId": 100,
  "tier": 3,
  "prizeAmount": "0.05",
  "merkleProof": [
    "0xabc123...",
    "0xdef456...",
    "0x789abc..."
  ],
  "leafHash": "0x123def...",
  "rootHash": "0x456789..."
}
```

**Error Responses:**
- `404 Not Found`: Ticket não é vencedor ou draw não consolidado

## Draws

### GET /api/draws

Lista todos os draws.

**Query Parameters:**
- `game` (number, opcional): Filtro por jogo
- `status` (string, opcional): Filtro por status
- `from` (string, opcional): Data inicial (ISO 8601)
- `to` (string, opcional): Data final (ISO 8601)

**Response:**
```json
{
  "draws": [
    {
      "id": 100,
      "game": 1,
      "scheduledAt": "2023-10-01T20:00:00Z",
      "cutoffAt": "2023-10-01T17:00:00Z",
      "status": "settled",
      "ticketCount": 1523,
      "totalPoolUSD": "38075.00",
      "winningNumbers": [1, 2, 3, 5, 7, 11, 13, 17, 19, 21, 23, 24, 25, 4, 6],
      "results": {
        "tier1": { "winners": 2, "prizePerWinner": "5000.00" },
        "tier2": { "winners": 15, "prizePerWinner": "500.00" },
        "tier3": { "winners": 234, "prizePerWinner": "25.00" }
      }
    }
  ]
}
```

### GET /api/draws/:drawId

Retorna detalhes de um draw específico.

### GET /api/draws/:drawId/winners

Lista vencedores de um draw.

**Response:**
```json
{
  "drawId": 100,
  "totalWinners": 251,
  "totalPrizes": "32500.00",
  "tiers": {
    "1": {
      "matches": 15,
      "winners": 2,
      "prizePerWinner": "5000.00",
      "tickets": ["123", "456"]
    },
    "2": {
      "matches": 14,
      "winners": 15,
      "prizePerWinner": "500.00",
      "tickets": ["789", "012", "345"]
    }
  }
}
```

## Estatísticas

### GET /api/stats/general

Estatísticas gerais do sistema.

**Response:**
```json
{
  "totalDraws": 500,
  "totalTickets": 125000,
  "totalPrizesDistributed": "2500000.00",
  "activeUsers": 8750,
  "gamesStats": {
    "1": {
      "name": "Lotofácil",
      "totalDraws": 350,
      "totalTickets": 87500,
      "averagePool": "45000.00"
    },
    "2": {
      "name": "SuperSete", 
      "totalDraws": 150,
      "totalTickets": 37500,
      "averagePool": "30000.00"
    }
  }
}
```

### GET /api/stats/frequency

Frequência de números sorteados.

**Query Parameters:**
- `game` (number): Jogo (1 ou 2)
- `period` (string, opcional): Período (`30d`, `90d`, `1y`, `all`)

**Response:**
```json
{
  "game": 1,
  "period": "90d",
  "totalDraws": 90,
  "frequency": {
    "1": { "count": 45, "percentage": 50.0, "trend": "hot" },
    "2": { "count": 38, "percentage": 42.2, "trend": "neutral" },
    "25": { "count": 12, "percentage": 13.3, "trend": "cold" }
  },
  "hotNumbers": [1, 5, 10, 15, 20],
  "coldNumbers": [3, 8, 18, 22, 25],
  "lastUpdate": "2023-10-01T20:30:00Z"
}
```

## WebSocket Events

### Conectando

```javascript
const ws = new WebSocket('wss://api.cryptodraw.com/ws');

ws.onopen = () => {
    // Subscribe to events
    ws.send(JSON.stringify({
        type: 'subscribe',
        events: ['drawCreated', 'drawConsolidated', 'prizeClaimed']
    }));
};
```

### Eventos Disponíveis

#### drawCreated
```json
{
  "type": "drawCreated",
  "data": {
    "drawId": 101,
    "game": 1,
    "scheduledAt": "2023-10-02T20:00:00Z"
  }
}
```

#### ticketMinted
```json
{
  "type": "ticketMinted",
  "data": {
    "ticketId": "1524",
    "owner": "0x123...",
    "drawId": 101,
    "game": 1
  }
}
```

#### drawConsolidated
```json
{
  "type": "drawConsolidated", 
  "data": {
    "drawId": 101,
    "ticketCount": 1850,
    "totalPool": "46250.00"
  }
}
```

#### randomnessFulfilled
```json
{
  "type": "randomnessFulfilled",
  "data": {
    "drawId": 101,
    "winningNumbers": [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 1, 3, 5]
  }
}
```

## Rate Limiting

### Limites por Endpoint

| Endpoint | Limite | Janela |
|----------|--------|--------|
| GET /api/tickets/* | 100/min | Por IP |
| GET /api/draws/* | 200/min | Por IP |
| GET /api/stats/* | 50/min | Por IP |
| WebSocket | 10 conexões | Por IP |

### Headers de Rate Limit

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1633024800
```

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Autenticação necessária |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

### Formato de Erro

```json
{
  "error": {
    "code": "INVALID_TICKET_ID",
    "message": "Ticket ID must be a valid number",
    "details": {
      "field": "ticketId",
      "value": "invalid"
    }
  }
}
```
```

### 1.2 GraphQL Schema
**Arquivo**: `api/graphql-schema.md`

```markdown
# GraphQL Schema

## Types

```graphql
type Ticket {
  id: ID!
  owner: String!
  game: Game!
  numbers: [Int!]!
  numbersPacked: String!
  roundsBought: Int!
  roundsRemaining: Int!
  firstDrawId: Int!
  createdAt: DateTime!
  expirationAt: DateTime!
  status: TicketStatus!
  transactionHash: String!
  draws: [Draw!]!
  winnings: [Winning!]!
}

type Draw {
  id: Int!
  game: Game!
  scheduledAt: DateTime!
  cutoffAt: DateTime!
  status: DrawStatus!
  merkleRoot: String
  totalPoolUSD: String
  randomness: String
  winningNumbers: [Int!]
  ticketCount: Int!
  results: DrawResults
  tickets: [Ticket!]!
}

enum Game {
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

## Queries

```graphql
type Query {
  # Tickets
  ticket(id: ID!): Ticket
  userTickets(
    address: String!
    status: TicketStatus
    game: Game
    first: Int = 20
    after: String
  ): TicketConnection!
  
  # Draws
  draw(id: Int!): Draw
  draws(
    game: Game
    status: DrawStatus
    first: Int = 20
    after: String
  ): DrawConnection!
  
  # Statistics
  gameStats(game: Game!): GameStatistics!
  numberFrequency(game: Game!, period: String = "90d"): NumberFrequency!
}
```

## Mutations

```graphql
type Mutation {
  # Admin only
  createDraw(input: CreateDrawInput!): CreateDrawPayload!
  consolidateDraw(input: ConsolidateDrawInput!): ConsolidateDrawPayload!
}
```
```

## 2. Documentação dos Contratos

### 2.1 Contract Documentation
**Arquivo**: `contracts/overview.md`

```markdown
# Smart Contracts Overview

## Architecture

O sistema CryptoDraw é composto por 5 contratos principais que trabalham em conjunto:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CryptoDraw    │────│   TicketNFT     │────│  PoolManager    │
│  (Main Logic)   │    │   (Tickets)     │    │   (Bolões)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PriceOracle    │    │RandomnessProvider│    │   External      │
│  (Price Feeds)  │    │  (Chainlink VRF) │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## CryptoDraw.sol - Contrato Principal

### Propósito
Contrato principal que gerencia draws, compra de tickets, consolidação e claims de prêmios.

### Principais Funcionalidades

#### 1. Compra de Tickets
```solidity
function buyTicket(
    uint8 game,
    uint32 numbersPacked,
    uint8 roundsBought,
    uint32 firstDrawId,
    uint256 maxPaymentAmount
) external payable returns (uint256 ticketId)
```

- Valida seleção de números
- Calcula preço baseado em USD
- Minta NFT não-transferível
- Emite evento `TicketMinted`

#### 2. Consolidação de Draws
```solidity
function consolidateDraw(
    uint32 drawId,
    bytes32 merkleRoot,
    uint256 totalPoolUSD
) external onlyRelayerOrAdmin
```

- Consolida entradas após cutoff
- Registra Merkle root das entradas
- Solicita randomness via Chainlink VRF
- Transiciona status do draw

#### 3. Claim de Prêmios
```solidity
function claimPrize(
    uint256 ticketId,
    bytes32[] calldata merkleProof,
    uint8 expectedTier
) external nonReentrant
```

- Valida prova Merkle
- Calcula prêmio baseado no tier
- Transfere fundos via pull pattern
- Queima ticket após claim

### Estados e Transições

```
SCHEDULED → OPEN → CLOSED → CONSOLIDATED → RANDOM_REQUESTED → RANDOM_FULFILLED → SETTLED
```

### Eventos Principais

```solidity
event TicketMinted(uint256 indexed ticketId, address indexed owner, uint8 game, uint32 firstDrawId);
event DrawCreated(uint32 indexed drawId, uint8 game, uint32 scheduledAt);
event DrawConsolidated(uint32 indexed drawId, bytes32 merkleRoot, uint256 totalPoolUSD);
event RandomnessFulfilled(uint32 indexed drawId, bytes32 randomness);
event PrizeClaimed(uint256 indexed ticketId, address indexed claimant, uint256 amount);
```

### Modifiers de Segurança

- `onlyRelayerOrAdmin`: Apenas consolidator ou admin
- `onlyDuringOpen(drawId)`: Apenas durante período de apostas
- `onlyAfterCutoff(drawId)`: Apenas após cutoff
- `nonReentrant`: Proteção contra reentrancy

## TicketNFT.sol - Tickets como NFTs

### Propósito
Implementa tickets como NFTs não-transferíveis (soulbound) com metadata dinâmica.

### Características

- **Não-transferível**: Tickets são soulbound para prevenir mercado secundário
- **Metadata Dinâmica**: Metadata muda baseado no status do ticket
- **Queima Automática**: Tickets expiram e podem ser queimados
- **Integração com CryptoDraw**: Apenas CryptoDraw pode mintar

### Funções Principais

```solidity
function mint(address to, uint256 tokenId, bytes calldata data) external onlyMinter
function burn(uint256 tokenId) external
function tokenURI(uint256 tokenId) public view override returns (string memory)
```

### Metadata Schema

```json
{
  "name": "CryptoDraw Ticket #123",
  "description": "Lotofácil ticket for draw #100",
  "image": "https://api.cryptodraw.com/tickets/123/image",
  "attributes": [
    {
      "trait_type": "Game",
      "value": "Lotofácil"
    },
    {
      "trait_type": "Numbers",
      "value": "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15"
    },
    {
      "trait_type": "Status", 
      "value": "Active"
    },
    {
      "trait_type": "Draw ID",
      "value": 100
    }
  ]
}
```

## PriceOracle.sol - Feeds de Preços

### Propósito
Fornece preços atualizados em USD para conversão de pagamentos em diferentes tokens.

### Integrações
- Chainlink Price Feeds
- Backup manual para emergências
- Multi-token support

### Funções

```solidity
function getUSDPrice(address token) external view returns (uint256)
function convertToUSD(address token, uint256 amount) external view returns (uint256)
function setPriceFeed(address token, address feed) external onlyOwner
```

## RandomnessProvider.sol - Gerador de Randomness

### Propósito
Interface com Chainlink VRF para geração de números aleatórios verificáveis.

### Fluxo de Randomness

1. `requestRandomness(drawId)` - Solicita randomness
2. Chainlink VRF processa request
3. `fulfillRandomness(requestId, randomValue)` - Callback com valor
4. Deriva números vencedores deterministicamente

### Algoritmos de Derivação

#### Lotofácil
```solidity
function deriveLotofacilWinning(uint256 randomness) internal pure returns (uint32 packed) {
    uint256 selected = 0;
    uint256 count = 0;
    uint256 seed = randomness;
    
    while (count < 15) {
        uint256 num = (seed % 25) + 1;
        if ((selected & (1 << (num - 1))) == 0) {
            selected |= (1 << (num - 1));
            count++;
        }
        seed = keccak256(abi.encode(seed));
    }
    
    return uint32(selected);
}
```

#### SuperSete
```solidity
function deriveSuperseteWinning(uint256 randomness) internal pure returns (uint32 packed) {
    uint32 result = 0;
    uint256 seed = randomness;
    
    for (uint256 i = 0; i < 7; i++) {
        uint256 digit = seed % 10;
        result |= uint32(digit << (i * 4));
        seed = uint256(keccak256(abi.encode(seed))) / 10;
    }
    
    return result;
}
```

## PoolManager.sol - Gestão de Bolões

### Propósito
Permite criação e gestão de bolões (pools) onde múltiplos usuários compartilham tickets e prêmios.

### Estruturas

```solidity
struct Pool {
    uint256 id;
    address creator;
    uint256 totalShares;
    uint256 maxParticipants;
    uint256 ticketPrice;
    uint8 game;
    uint32 targetDrawId;
    bool finalized;
}

struct Participation {
    address participant;
    uint256 shares;
    uint256 contribution;
}
```

### Fluxo de Bolão

1. **Criação**: `createPool()` - Usuário cria bolão
2. **Participação**: `joinPool()` - Outros usuários aderem
3. **Finalização**: `finalizePool()` - Compra tickets em nome do pool
4. **Distribuição**: `distributePrizes()` - Distribui prêmios proporcionalmente

## Segurança e Otimizações

### Padrões de Segurança Implementados

- **ReentrancyGuard**: Proteção contra reentrancy attacks
- **AccessControl**: Sistema de roles e permissões
- **Pausable**: Capacidade de pausar em emergências
- **Pull Payment**: Padrão pull para withdrawals

### Otimizações de Gas

- **Packed Structs**: Redução de storage slots
- **Custom Errors**: Economia vs require strings  
- **Batch Operations**: Operações em lote quando possível
- **View Functions**: Leituras otimizadas

### Limites e Validações

| Parâmetro | Limite | Razão |
|-----------|--------|-------|
| Rounds por ticket | 1-6 | Evitar tickets muito longos |
| Cutoff time | 3 horas | Tempo para consolidação |
| Max participants/pool | 100 | Gas limits |
| Ticket expiry | 14 dias | Cleanup automático |

## Deployment e Upgrades

### Deployment Order

1. PriceOracle
2. RandomnessProvider  
3. TicketNFT
4. CryptoDraw
5. PoolManager
6. Configure permissions

### Upgrade Strategy

- **Proxy Pattern**: Contratos upgradeáveis via proxy
- **Storage Gaps**: Reserva slots para futuras variáveis
- **Interface Stability**: ABIs estáveis para integrações
- **Migration Scripts**: Scripts para migração de dados
```

### 2.2 Security Audit Report Template
**Arquivo**: `security/audit-template.md`

```markdown
# Security Audit Report - CryptoDraw

## Executive Summary

### Audit Overview
- **Project**: CryptoDraw Lottery System
- **Audit Period**: [Start Date] - [End Date]  
- **Auditor**: [Auditor Name/Company]
- **Commit Hash**: [Git commit hash]

### Scope
- CryptoDraw.sol
- TicketNFT.sol
- PriceOracle.sol
- RandomnessProvider.sol
- PoolManager.sol

### Methodology
- Manual code review
- Automated analysis tools (Slither, MythX)
- Economic attack vector analysis
- Formal verification (where applicable)

## Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ |
| High | 0 | ✅ |
| Medium | 2 | 🔧 Fixed |
| Low | 5 | 🔧 Fixed |
| Informational | 8 | 📝 Acknowledged |

## Detailed Findings

### HIGH-001: [Example] Reentrancy in Prize Claims

**Severity**: High  
**Status**: 🔧 Fixed  
**Location**: CryptoDraw.sol:claimPrize()

**Description**:
The `claimPrize` function was vulnerable to reentrancy attacks due to external call before state change.

**Impact**:
Attacker could drain contract funds by claiming the same prize multiple times.

**Recommendation**:
Implement ReentrancyGuard and follow checks-effects-interactions pattern.

**Fix Applied**:
```solidity
// Before (vulnerable)
function claimPrize(uint256 ticketId, bytes32[] calldata proof, uint8 tier) external {
    uint256 amount = calculatePrize(ticketId, tier);
    payable(msg.sender).transfer(amount); // External call first
    tickets[ticketId].status = TicketStatus.REDEEMED; // State change after
}

// After (secure)
function claimPrize(uint256 ticketId, bytes32[] calldata proof, uint8 tier) 
    external nonReentrant {
    uint256 amount = calculatePrize(ticketId, tier);
    tickets[ticketId].status = TicketStatus.REDEEMED; // State change first
    withdrawableBalances[msg.sender] += amount; // Pull pattern
    emit PrizeClaimed(ticketId, msg.sender, amount);
}
```

### MEDIUM-001: Integer Overflow in Prize Calculation

**Severity**: Medium  
**Status**: 🔧 Fixed  
**Location**: CryptoDraw.sol:calculateTierPrize()

**Description**:
Large pool amounts could cause integer overflow when calculating individual prizes.

**Recommendation**:
Use SafeMath or upgrade to Solidity 0.8+ with built-in overflow protection.

### LOW-001: Missing Zero Address Checks

**Severity**: Low  
**Status**: 🔧 Fixed  
**Location**: Multiple functions

**Description**:
Several functions don't validate that address parameters are not zero address.

**Recommendation**:
Add `require(address != address(0))` checks for all address parameters.

## Gas Optimization Findings

### GAS-001: Inefficient Storage Access
**Location**: CryptoDraw.sol:buyTicket()  
**Savings**: ~2,000 gas per transaction

Cache storage variables in memory when accessed multiple times:

```solidity
// Before
if (draws[drawId].status != DrawStatus.OPEN) revert();
if (block.timestamp >= draws[drawId].cutoffAt) revert();

// After  
Draw storage draw = draws[drawId];
if (draw.status != DrawStatus.OPEN) revert();
if (block.timestamp >= draw.cutoffAt) revert();
```

### GAS-002: Packed Struct Optimization
**Location**: TicketNFT.sol  
**Savings**: ~20,000 gas per mint

Optimize struct packing to use fewer storage slots:

```solidity
// Before (3 slots)
struct TicketData {
    address owner;     // 20 bytes
    uint256 drawId;    // 32 bytes  
    uint8 game;        // 1 byte
}

// After (2 slots)
struct TicketData {
    address owner;     // 20 bytes
    uint8 game;        // 1 byte
    uint32 drawId;     // 4 bytes (sufficient for draw IDs)
}
```

## Economic Attack Vectors

### MEV Protection
**Risk**: Medium  
**Analysis**: Front-running attacks on ticket purchases could affect fairness.  
**Mitigation**: Implement commit-reveal scheme or use private mempools.

### Oracle Manipulation
**Risk**: Low  
**Analysis**: Price oracle manipulation could affect ticket pricing.  
**Mitigation**: Use decentralized oracles with multiple feeds and circuit breakers.

### Governance Attacks
**Risk**: Low  
**Analysis**: Admin key compromise could pause system or drain funds.  
**Mitigation**: Implement multi-sig and timelock for admin functions.

## Formal Verification Results

### Properties Verified
1. ✅ Total supply conservation (tickets minted = tickets existing + burned)
2. ✅ Prize pool conservation (total prizes ≤ total pool)
3. ✅ Access control correctness (only authorized can call admin functions)
4. ✅ State transition validity (draw status follows correct sequence)

### Tools Used
- Certora Prover
- K-framework
- Dafny specifications

## Recommendations

### Immediate Actions Required
1. ✅ Fix reentrancy vulnerability  
2. ✅ Add overflow protection
3. ✅ Implement zero address checks
4. ✅ Optimize gas usage

### Future Improvements
1. 📋 Implement commit-reveal for ticket purchases
2. 📋 Add circuit breakers for emergency stops
3. 📋 Consider upgradeability for future improvements
4. 📋 Implement formal governance process

## Test Coverage Analysis

### Current Coverage: 94.2%

| Contract | Lines | Functions | Branches | Coverage |
|----------|-------|-----------|----------|----------|
| CryptoDraw | 245/256 | 18/19 | 67/72 | 95.7% |
| TicketNFT | 89/95 | 12/12 | 23/25 | 93.7% |
| PriceOracle | 45/48 | 8/8 | 12/14 | 93.8% |
| RandomnessProvider | 67/72 | 9/10 | 18/20 | 93.1% |
| PoolManager | 123/134 | 15/16 | 34/38 | 91.8% |

### Missing Coverage
- Edge cases in randomness derivation
- Some error conditions in pool management
- Gas limit scenarios

## Conclusion

The CryptoDraw smart contract system demonstrates strong security practices and comprehensive functionality. All high and medium severity issues have been addressed. The remaining low-severity issues and gas optimizations should be considered for future updates.

### Security Rating: A-

The system is ready for mainnet deployment with the implemented fixes.
```

## 3. Guias do Usuário

### 3.1 User Guide
**Arquivo**: `user-guide/getting-started.md`

```markdown
# Guia do Usuário - CryptoDraw

## Primeiros Passos

### 1. Conectando sua Wallet

Para participar do CryptoDraw, você precisa de uma wallet compatível:

**Wallets Suportadas:**
- MetaMask (Recomendado)
- WalletConnect
- Coinbase Wallet
- Rainbow

**Como Conectar:**
1. Acesse [cryptodraw.com](https://cryptodraw.com)
2. Clique em "Conectar Wallet" no canto superior direito
3. Escolha sua wallet preferida
4. Autorize a conexão

### 2. Comprando seu Primeiro Ticket

#### Lotofácil
1. Vá para a página "Lotofácil"
2. Selecione 15 números entre 1 e 25
3. Escolha quantas rodadas quer participar (1-6)
4. Confirme o valor total
5. Clique em "Comprar Ticket"
6. Confirme a transação na sua wallet

**Dicas de Seleção:**
- 🎲 Use "Surpresinha" para seleção automática
- 📊 Consulte estatísticas de frequência
- 🔄 Combine números quentes e frios

#### SuperSete
1. Vá para a página "SuperSete"
2. Escolha um dígito (0-9) para cada uma das 7 colunas
3. Escolha quantas rodadas quer participar
4. Confirme e compre seu ticket

### 3. Acompanhando seus Tickets

#### Na página "Meus Tickets":
- ✅ **Ativos**: Tickets que participarão de próximos sorteios
- ⏰ **Aguardando**: Tickets em draws ainda não sorteados
- 🏆 **Premiados**: Tickets que ganharam prêmios
- ❌ **Expirados**: Tickets que não foram resgatados a tempo

#### Status dos Tickets:
```
🟢 Ativo      - Ticket válido para próximos draws
🟡 Premiado   - Ticket ganhou, precisa resgatar
🔴 Expirado   - Ticket venceu prazo para resgate  
⚫ Queimado   - Ticket foi resgatado ou expirou
```

### 4. Verificando Resultados

#### Página de Resultados:
1. Escolha o jogo (Lotofácil ou SuperSete)
2. Selecione o draw desejado
3. Veja os números sorteados
4. Confira a distribuição de prêmios

#### Como são Calculados os Prêmios:

**Lotofácil:**
- 15 acertos: 50% do pool
- 14 acertos: 20% do pool  
- 13 acertos: 15% do pool
- 12 acertos: 10% do pool
- 11 acertos: 5% do pool

**SuperSete:**
- 7 acertos: 40% do pool
- 6 acertos: 25% do pool
- 5 acertos: 20% do pool
- 4 acertos: 10% do pool
- 3 acertos: 5% do pool

### 5. Resgatando Prêmios

Quando você ganha:
1. Vá para "Meus Tickets"
2. Encontre tickets com status "Premiado" 🏆
3. Clique em "Resgatar Prêmio"
4. Confirme a transação
5. O prêmio será depositado na sua wallet

**⚠️ Importante**: Prêmios devem ser resgatados em até 14 dias após o sorteio!

## Bolões (Pools)

### Criando um Bolão

1. Acesse "Bolões" no menu
2. Clique em "Criar Bolão"
3. Configure:
   - Jogo (Lotofácil ou SuperSete)
   - Número máximo de participantes
   - Valor da cota
   - Draw alvo
4. Compartilhe o código do bolão

### Participando de um Bolão

1. Use o código compartilhado pelo criador
2. Ou navegue pelos bolões públicos
3. Escolha quantas cotas quer comprar
4. Confirme sua participação

### Vantagens dos Bolões

- 💰 **Custo menor**: Divide o custo entre participantes
- 🎯 **Mais chances**: Compra mais tickets com o mesmo valor
- 🤝 **Social**: Jogue com amigos e família
- 📈 **Maior diversificação**: Diferentes combinações de números

## Estatísticas e Análises

### Frequência de Números

Acompanhe quais números saem mais frequentemente:
- 🔥 **Números Quentes**: Sorteados frequentemente
- ❄️ **Números Frios**: Sorteados raramente
- 📊 **Tendências**: Padrões de 30, 90 dias ou histórico completo

### Análises Úteis

- **Números Consecutivos**: Frequência de sequências
- **Pares vs Ímpares**: Distribuição estatística
- **Soma dos Números**: Análise da soma total
- **Padrões Geométricos**: Distribuição no volante

## Segurança e Boas Práticas

### Proteção da Wallet

1. **Never share your seed phrase**
2. Use hardware wallet para valores altos
3. Verifique sempre o endereço do contrato
4. Confirme detalhes antes de assinar transações

### Endereços Oficiais

**Contratos na Mainnet:**
- CryptoDraw: `0x...` (verificado no Etherscan)
- TicketNFT: `0x...` (verificado no Etherscan)

**Sites Oficiais:**
- Website: https://cryptodraw.com
- Twitter: @cryptodraw
- Discord: discord.gg/cryptodraw

### Cuidados com Phishing

- ❌ Nunca acesse links suspeitos
- ✅ Sempre digite o URL manualmente
- ❌ Não compartilhe chaves privadas
- ✅ Verifique certificado SSL (🔒)

## FAQ - Perguntas Frequentes

### Sobre Tickets

**Q: Posso transferir meu ticket para outra pessoa?**
A: Não, tickets são NFTs "soulbound" (não-transferíveis) para manter a integridade do jogo.

**Q: O que acontece se eu perder acesso à minha wallet?**
A: Infelizmente, não podemos recuperar tickets em wallets perdidas. Sempre faça backup da sua seed phrase.

**Q: Posso cancelar um ticket após a compra?**
A: Não, tickets não podem ser cancelados após a compra e confirmação na blockchain.

### Sobre Sorteios

**Q: Como posso ter certeza de que os sorteios são justos?**
A: Usamos Chainlink VRF (Verifiable Random Function) que é verificável e à prova de manipulação.

**Q: Quando acontecem os sorteios?**
A: 
- Lotofácil: Diariamente às 20:00 UTC
- SuperSete: Semanalmente aos sábados às 20:00 UTC

**Q: O que acontece se ninguém acertar todos os números?**
A: O prêmio da faixa principal acumula para o próximo sorteio.

### Sobre Prêmios

**Q: Como recebo meu prêmio?**
A: Prêmios são pagos em ETH diretamente na sua wallet após o resgate.

**Q: Há taxa para resgatar prêmios?**
A: Você paga apenas a taxa de gas da rede Ethereum.

**Q: Até quando posso resgatar um prêmio?**
A: Você tem 14 dias após o sorteio para resgatar.

## Suporte

### Canais de Atendimento

- 💬 **Discord**: Suporte da comunidade 24/7
- 📧 **Email**: support@cryptodraw.com  
- 🐦 **Twitter**: @cryptodraw
- 📚 **Docs**: docs.cryptodraw.com

### Relatório de Bugs

Encontrou um problema? Ajude-nos a melhorar:

1. Descreva o problema detalhadamente
2. Inclua screenshots se possível
3. Informe seu navegador e versão da wallet
4. Envie para bugs@cryptodraw.com

**Bug Bounty**: Recompensamos quem encontra vulnerabilidades de segurança!
```

## 4. Guias para Desenvolvedores

### 4.1 Developer Guide
**Arquivo**: `developer/integration-guide.md`

```markdown
# Integration Guide - CryptoDraw

## SDK e Libraries

### JavaScript/TypeScript SDK

Instalação:
```bash
npm install @cryptodraw/sdk
```

Uso básico:
```typescript
import { CryptoDrawSDK } from '@cryptodraw/sdk';

const sdk = new CryptoDrawSDK({
    network: 'mainnet', // ou 'goerli'
    provider: window.ethereum
});

// Comprar ticket
const ticket = await sdk.buyTicket({
    game: 'LOTOFACIL',
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    rounds: 3
});

// Verificar resultado
const draw = await sdk.getDraw(100);
const isWinner = sdk.checkWinning(ticket, draw.winningNumbers);
```

### React Hooks

```typescript
import { useCryptoDraw, useTickets, useDraw } from '@cryptodraw/react';

function MyComponent() {
    const { buyTicket, claimPrize } = useCryptoDraw();
    const { tickets, loading } = useTickets('0x...');
    const { draw } = useDraw(100);
    
    return (
        <div>
            {tickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
            ))}
        </div>
    );
}
```

## Smart Contract Integration

### Contract Addresses

```typescript
// Mainnet
export const MAINNET_CONTRACTS = {
    CRYPTODRAW: '0x...',
    TICKET_NFT: '0x...',
    POOL_MANAGER: '0x...'
};

// Goerli Testnet  
export const GOERLI_CONTRACTS = {
    CRYPTODRAW: '0x...',
    TICKET_NFT: '0x...',
    POOL_MANAGER: '0x...'
};
```

### ABIs

ABIs completas disponíveis em: `https://api.cryptodraw.com/abis/`

### Example Integration

```typescript
import { ethers } from 'ethers';
import CryptoDrawABI from './abis/CryptoDraw.json';

class CryptoDrawClient {
    private contract: ethers.Contract;
    
    constructor(provider: ethers.Provider, signer?: ethers.Signer) {
        this.contract = new ethers.Contract(
            CRYPTODRAW_ADDRESS,
            CryptoDrawABI,
            signer || provider
        );
    }
    
    async buyTicket(params: BuyTicketParams): Promise<string> {
        const packedNumbers = this.packNumbers(params.numbers, params.game);
        
        const tx = await this.contract.buyTicket(
            params.game === 'LOTOFACIL' ? 1 : 2,
            packedNumbers,
            params.rounds,
            params.drawId,
            params.maxPayment,
            { value: params.payment }
        );
        
        return tx.hash;
    }
    
    async claimPrize(ticketId: string, proof: string[]): Promise<string> {
        const tx = await this.contract.claimPrize(
            ticketId,
            proof,
            expectedTier
        );
        
        return tx.hash;
    }
    
    private packNumbers(numbers: number[], game: 'LOTOFACIL' | 'SUPERSETE'): number {
        if (game === 'LOTOFACIL') {
            return numbers.reduce((acc, num) => acc | (1 << (num - 1)), 0);
        } else {
            return numbers.reduce((acc, digit, index) => acc | (digit << (index * 4)), 0);
        }
    }
}
```

## API Integration

### REST API

Base URL: `https://api.cryptodraw.com`

#### Authentication

Para endpoints que requerem autenticação, use assinatura de mensagem:

```typescript
async function authenticateRequest(wallet: ethers.Wallet, endpoint: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${endpoint}:${timestamp}`;
    const signature = await wallet.signMessage(message);
    
    return {
        headers: {
            'X-Wallet-Address': wallet.address,
            'X-Timestamp': timestamp.toString(),
            'X-Signature': signature
        }
    };
}
```

#### Examples

```typescript
// Get user tickets
const response = await fetch(`/api/tickets/user/${address}`, {
    headers: await authenticateRequest(wallet, `/api/tickets/user/${address}`)
});
const tickets = await response.json();

// Get draw results  
const draw = await fetch(`/api/draws/${drawId}`).then(r => r.json());

// Get winning proof
const proof = await fetch(`/api/tickets/${ticketId}/proof`).then(r => r.json());
```

### WebSocket Events

```typescript
const ws = new WebSocket('wss://api.cryptodraw.com/ws');

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'subscribe',
        events: ['drawCreated', 'ticketMinted', 'randomnessFulfilled']
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'drawCreated':
            handleNewDraw(data.data);
            break;
        case 'ticketMinted':
            handleNewTicket(data.data);
            break;
        case 'randomnessFulfilled':
            handleDrawResults(data.data);
            break;
    }
};
```

### GraphQL

```typescript
const GET_USER_TICKETS = gql`
    query GetUserTickets($address: String!, $first: Int!, $after: String) {
        userTickets(address: $address, first: $first, after: $after) {
            edges {
                node {
                    id
                    game
                    numbers
                    status
                    draws {
                        id
                        scheduledAt
                        status
                        winningNumbers
                    }
                    winnings {
                        amount
                        tier
                        claimed
                    }
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`;
```

## Number Packing Utilities

### Lotofácil Packing

```typescript
export function packLotofasilNumbers(numbers: number[]): number {
    if (numbers.length !== 15) {
        throw new Error('Lotofácil requires exactly 15 numbers');
    }
    
    if (!numbers.every(n => n >= 1 && n <= 25)) {
        throw new Error('Numbers must be between 1 and 25');
    }
    
    return numbers.reduce((acc, num) => acc | (1 << (num - 1)), 0);
}

export function unpackLotofasilNumbers(packed: number): number[] {
    const numbers: number[] = [];
    
    for (let i = 0; i < 25; i++) {
        if (packed & (1 << i)) {
            numbers.push(i + 1);
        }
    }
    
    return numbers;
}
```

### SuperSete Packing

```typescript
export function packSuperseteNumbers(columns: number[]): number {
    if (columns.length !== 7) {
        throw new Error('SuperSete requires exactly 7 columns');
    }
    
    if (!columns.every(d => d >= 0 && d <= 9)) {
        throw new Error('Digits must be between 0 and 9');
    }
    
    return columns.reduce((acc, digit, index) => acc | (digit << (index * 4)), 0);
}

export function unpackSuperseteNumbers(packed: number): number[] {
    const columns: number[] = [];
    
    for (let i = 0; i < 7; i++) {
        columns.push((packed >> (i * 4)) & 0xF);
    }
    
    return columns;
}
```

## Event Monitoring

### Contract Events

```typescript
class EventMonitor {
    private contract: ethers.Contract;
    
    constructor(contract: ethers.Contract) {
        this.contract = contract;
    }
    
    startMonitoring() {
        // Monitor ticket mints
        this.contract.on('TicketMinted', (ticketId, owner, game, drawId) => {
            this.handleTicketMinted({ ticketId, owner, game, drawId });
        });
        
        // Monitor draw consolidation
        this.contract.on('DrawConsolidated', (drawId, merkleRoot, totalPool) => {
            this.handleDrawConsolidated({ drawId, merkleRoot, totalPool });
        });
        
        // Monitor prize claims
        this.contract.on('PrizeClaimed', (ticketId, claimant, amount) => {
            this.handlePrizeClaimed({ ticketId, claimant, amount });
        });
    }
    
    async getHistoricalEvents(fromBlock: number, toBlock: number) {
        const filter = this.contract.filters.TicketMinted();
        const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
        
        return events.map(event => ({
            ticketId: event.args.ticketId.toString(),
            owner: event.args.owner,
            game: event.args.game,
            drawId: event.args.drawId,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
        }));
    }
}
```

## Testing Helpers

### Mock Provider

```typescript
export class MockCryptoDrawProvider {
    private tickets: Map<string, Ticket> = new Map();
    private draws: Map<number, Draw> = new Map();
    
    async buyTicket(params: BuyTicketParams): Promise<string> {
        const ticketId = `mock-${Date.now()}`;
        
        this.tickets.set(ticketId, {
            id: ticketId,
            owner: params.owner,
            game: params.game,
            numbers: params.numbers,
            status: 'active'
        });
        
        return ticketId;
    }
    
    async getDraw(drawId: number): Promise<Draw | null> {
        return this.draws.get(drawId) || null;
    }
    
    createMockDraw(drawId: number, overrides?: Partial<Draw>): Draw {
        const draw: Draw = {
            id: drawId,
            game: 'LOTOFACIL',
            scheduledAt: new Date(),
            status: 'settled',
            winningNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            ...overrides
        };
        
        this.draws.set(drawId, draw);
        return draw;
    }
}
```

### Test Utilities

```typescript
export const testUtils = {
    generateRandomLotofasilNumbers(): number[] {
        const numbers = new Set<number>();
        while (numbers.size < 15) {
            numbers.add(Math.floor(Math.random() * 25) + 1);
        }
        return Array.from(numbers).sort((a, b) => a - b);
    },
    
    generateRandomSuperseteNumbers(): number[] {
        return Array.from({ length: 7 }, () => Math.floor(Math.random() * 10));
    },
    
    calculateMatches(selected: number[], winning: number[]): number {
        return selected.filter(num => winning.includes(num)).length;
    },
    
    async waitForTransaction(provider: ethers.Provider, txHash: string): Promise<ethers.TransactionReceipt> {
        return await provider.waitForTransaction(txHash);
    }
};
```

## Error Handling

### Common Errors

```typescript
export enum CryptoDrawError {
    INVALID_NUMBERS = 'INVALID_NUMBERS',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS', 
    DRAW_CLOSED = 'DRAW_CLOSED',
    TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
    ALREADY_CLAIMED = 'ALREADY_CLAIMED',
    NETWORK_ERROR = 'NETWORK_ERROR'
}

export class CryptoDrawSDKError extends Error {
    constructor(
        public code: CryptoDrawError,
        message: string,
        public originalError?: any
    ) {
        super(message);
        this.name = 'CryptoDrawSDKError';
    }
}

// Usage
try {
    await sdk.buyTicket(params);
} catch (error) {
    if (error instanceof CryptoDrawSDKError) {
        switch (error.code) {
            case CryptoDrawError.INVALID_NUMBERS:
                showError('Por favor, selecione números válidos');
                break;
            case CryptoDrawError.INSUFFICIENT_FUNDS:
                showError('Saldo insuficiente na wallet');
                break;
            default:
                showError('Erro desconhecido');
        }
    }
}
```

## Gas Optimization Tips

### Efficient Number Packing

```typescript
// Instead of multiple transactions
const numbers1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const numbers2 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

await contract.buyTicket(1, packNumbers(numbers1), 1, drawId);
await contract.buyTicket(1, packNumbers(numbers2), 1, drawId);

// Use batch purchase (if available)
await contract.buyTicketsBatch([
    { game: 1, numbers: packNumbers(numbers1), rounds: 1, drawId },
    { game: 1, numbers: packNumbers(numbers2), rounds: 1, drawId }
]);
```

### Gas Price Monitoring

```typescript
export async function getOptimalGasPrice(provider: ethers.Provider): Promise<bigint> {
    const feeData = await provider.getFeeData();
    
    // Use 10% above standard gas price for faster confirmation
    return feeData.gasPrice ? feeData.gasPrice * 110n / 100n : 0n;
}
```

## Rate Limiting Best Practices

```typescript
export class RateLimitedAPI {
    private requests: number[] = [];
    private readonly maxRequests = 100;
    private readonly timeWindow = 60000; // 1 minute
    
    async request<T>(url: string, options?: RequestInit): Promise<T> {
        await this.checkRateLimit();
        
        const response = await fetch(url, options);
        
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request(url, options);
        }
        
        return response.json();
    }
    
    private async checkRateLimit(): Promise<void> {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.timeWindow - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
    }
}
```

Isso conclui o guia básico de integração. Para exemplos mais detalhados e casos de uso avançados, consulte nossa documentação completa em [docs.cryptodraw.com](https://docs.cryptodraw.com).
```

## Checklist de Implementação da Documentação

### API Documentation
- [ ] REST API reference completa
- [ ] GraphQL schema e queries
- [ ] WebSocket events documentation
- [ ] Rate limiting guidelines
- [ ] Error codes e handling
- [ ] Authentication methods

### Contract Documentation  
- [ ] Architecture overview
- [ ] Function signatures e parameters
- [ ] Events e error definitions
- [ ] Security considerations
- [ ] Gas optimization guide
- [ ] Deployment instructions

### User Guides
- [ ] Getting started guide
- [ ] Wallet connection tutorial
- [ ] Ticket purchase walkthrough
- [ ] Prize claiming process
- [ ] Pool creation and joining
- [ ] FAQ section

### Developer Guides
- [ ] SDK documentation
- [ ] Integration examples
- [ ] Testing utilities
- [ ] Error handling patterns
- [ ] Best practices guide
- [ ] Migration guides

### Security Documentation
- [ ] Audit reports
- [ ] Security best practices
- [ ] Vulnerability disclosure
- [ ] Bug bounty program
- [ ] Emergency procedures
- [ ] Access control documentation