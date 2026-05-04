# Testes - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém todos os testes do projeto CryptoDraw, organizados por tipo e componente. Implementar uma estratégia de testes abrangente conforme checklist da seção 11 da especificação técnica.

## Estrutura de Testes

```
tests/
├── unit/                    # Testes unitários
│   ├── contracts/          # Testes de contratos Solidity
│   ├── backend/            # Testes do backend
│   └── frontend/           # Testes de componentes React
├── integration/            # Testes de integração
│   ├── api/               # Testes de API
│   ├── blockchain/        # Testes blockchain
│   └── e2e-components/    # Testes de componentes integrados
└── e2e/                   # Testes end-to-end
    ├── user-flows/        # Fluxos de usuário
    └── performance/       # Testes de performance
```

## 1. Testes Unitários de Contratos

### 1.1 CryptoDraw Contract Tests
**Arquivo**: `unit/contracts/CryptoDraw.test.js`

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDraw Contract", function () {
    async function deployCryptoDrawFixture() {
        const [owner, user1, user2, consolidator] = await ethers.getSigners();
        
        const CryptoDraw = await ethers.getContractFactory("CryptoDraw");
        const cryptoDraw = await CryptoDraw.deploy();
        
        return { cryptoDraw, owner, user1, user2, consolidator };
    }

    describe("Ticket Purchase", function () {
        it("Should allow buying valid Lotofácil ticket", async function () {
            const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
            
            // Testar compra de ticket válido
            const gameType = 1; // LOTOFACIL
            const packedNumbers = 0x0000401B; // [1,2,3,5,15] packed
            const roundsBought = 1;
            const firstDrawId = 1;
            const maxPayment = ethers.parseEther("0.1");
            
            await expect(cryptoDraw.connect(user1).buyTicket(
                gameType,
                packedNumbers,
                roundsBought,
                firstDrawId,
                maxPayment,
                { value: ethers.parseEther("0.05") }
            )).to.emit(cryptoDraw, "TicketMinted");
        });

        it("Should reject invalid number selections", async function () {
            const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
            
            // Testar seleção inválida (menos de 15 números)
            const invalidPacked = 0x0000001F; // apenas 5 números
            
            await expect(cryptoDraw.connect(user1).buyTicket(
                1, invalidPacked, 1, 1, ethers.parseEther("0.1"),
                { value: ethers.parseEther("0.05") }
            )).to.be.revertedWithCustomError(cryptoDraw, "InvalidNumberSelection");
        });

        it("Should reject purchases after cutoff", async function () {
            // Testar compra após cutoff
            // Simular passage of time
            // Verificar rejeição
        });
    });

    describe("Draw Consolidation", function () {
        it("Should allow consolidator to submit valid consolidation", async function () {
            const { cryptoDraw, consolidator } = await loadFixture(deployCryptoDrawFixture);
            
            // Mock de dados de consolidação
            const drawId = 1;
            const merkleRoot = "0x1234...";
            const totalPoolUSD = ethers.parseUnits("1000", 6); // $1000
            
            await expect(cryptoDraw.connect(consolidator).consolidateDraw(
                drawId,
                merkleRoot,
                totalPoolUSD
            )).to.emit(cryptoDraw, "DrawConsolidated");
        });

        it("Should reject consolidation from unauthorized address", async function () {
            // Testar rejeição de não-consolidator
        });

        it("Should reject double consolidation", async function () {
            // Testar múltiplas consolidações do mesmo draw
        });
    });

    describe("Randomness and Results", function () {
        it("Should generate valid Lotofácil winning numbers", async function () {
            const { cryptoDraw } = await loadFixture(deployCryptoDrawFixture);
            
            const mockRandomness = "0x123456789abcdef...";
            
            // Testar derivação determinística
            // Verificar que são 15 números únicos entre 1-25
            // Testar múltiplas seeds diferentes
        });

        it("Should generate valid SuperSete winning numbers", async function () {
            const { cryptoDraw } = await loadFixture(deployCryptoDrawFixture);
            
            const mockRandomness = "0x987654321fedcba...";
            
            // Testar derivação determinística
            // Verificar 7 dígitos 0-9
            // Testar múltiplas seeds diferentes
        });
    });

    describe("Prize Claims", function () {
        it("Should allow valid claim with correct Merkle proof", async function () {
            // Setup: criar draw, consolidar, gerar proof
            // Testar claim com proof válido
            // Verificar transferência de prêmio
        });

        it("Should reject invalid Merkle proofs", async function () {
            // Testar proofs inválidos
            // Testar leaf manipulation
        });

        it("Should prevent double claims", async function () {
            // Testar múltiplos claims do mesmo ticket
        });

        it("Should calculate correct prize amounts per tier", async function () {
            // Testar cálculo de prêmios
            // Verificar divisão por tier
        });
    });

    describe("Number Packing", function () {
        it("Should pack and unpack Lotofácil numbers correctly", async function () {
            const numbers = [1, 5, 10, 15, 20, 25, 2, 7, 12, 17, 22, 3, 8, 13, 18];
            
            // Testar packing
            const packed = await cryptoDraw.packLotofacilNumbers(numbers);
            
            // Testar unpacking
            const unpacked = await cryptoDraw.unpackLotofacilNumbers(packed);
            
            expect(unpacked).to.deep.equal(numbers.sort((a, b) => a - b));
        });

        it("Should pack and unpack SuperSete numbers correctly", async function () {
            const columns = [1, 2, 3, 4, 5, 6, 7];
            
            const packed = await cryptoDraw.packSuperseteNumbers(columns);
            const unpacked = await cryptoDraw.unpackSuperseteNumbers(packed);
            
            expect(unpacked).to.deep.equal(columns);
        });
    });

    describe("Gas Optimization", function () {
        it("Should use reasonable gas for ticket purchase", async function () {
            // Benchmark gas usage
            // Verificar limites aceitáveis
        });

        it("Should use reasonable gas for prize claims", async function () {
            // Benchmark gas de claims
        });
    });

    describe("Security", function () {
        it("Should prevent reentrancy attacks", async function () {
            // Testar reentrancy guard
        });

        it("Should validate all inputs properly", async function () {
            // Testar edge cases de input
            // Zero values, overflow, underflow
        });

        it("Should enforce proper access controls", async function () {
            // Testar roles e permissions
        });
    });
});
```

### 1.2 TicketNFT Contract Tests
**Arquivo**: `unit/contracts/TicketNFT.test.js`

```javascript
describe("TicketNFT Contract", function () {
    describe("Minting", function () {
        it("Should mint non-transferable NFT", async function () {
            // Testar mint de NFT
            // Verificar que é soulbound
        });

        it("Should generate correct metadata", async function () {
            // Testar metadata do NFT
            // Verificar tokenURI
        });
    });

    describe("Expiration and Burning", function () {
        it("Should allow burning expired tickets", async function () {
            // Testar queima de tickets expirados
        });

        it("Should prevent burning valid tickets", async function () {
            // Testar proteção contra queima indevida
        });
    });
});
```

### 1.3 Pool Manager Tests
**Arquivo**: `unit/contracts/PoolManager.test.js`

```javascript
describe("PoolManager Contract", function () {
    describe("Pool Creation", function () {
        it("Should create pool correctly", async function () {
            // Testar criação de bolão
        });

        it("Should handle multiple participants", async function () {
            // Testar múltiplos participantes
        });
    });

    describe("Prize Distribution", function () {
        it("Should distribute prizes proportionally", async function () {
            // Testar distribuição proporcional
        });
    });
});
```

## 2. Testes Unitários de Backend

### 2.1 Service Tests
**Arquivo**: `unit/backend/services/ConsolidatorService.test.ts`

```typescript
import { ConsolidatorService } from '../../../backend/src/services/ConsolidatorService';
import { MerkleTree } from '../../../backend/src/utils/MerkleTree';

describe('ConsolidatorService', () => {
    let consolidatorService: ConsolidatorService;
    
    beforeEach(() => {
        consolidatorService = new ConsolidatorService();
    });

    describe('collectValidTickets', () => {
        it('should collect only valid tickets after cutoff', async () => {
            const drawId = 1;
            const cutoffTime = new Date('2023-10-01T15:00:00Z');
            
            // Mock tickets data
            const mockTickets = [
                { id: '1', createdAt: new Date('2023-10-01T14:30:00Z') }, // Valid
                { id: '2', createdAt: new Date('2023-10-01T15:30:00Z') }  // Invalid (after cutoff)
            ];
            
            // Mock database
            jest.spyOn(consolidatorService, 'getTicketsForDraw').mockResolvedValue(mockTickets);
            
            const validTickets = await consolidatorService.collectValidTickets(drawId);
            
            expect(validTickets).toHaveLength(1);
            expect(validTickets[0].id).toBe('1');
        });
    });

    describe('generateMerkleTree', () => {
        it('should generate valid Merkle tree and proofs', async () => {
            const tickets = [
                {
                    ticketId: '1',
                    owner: '0x123...',
                    game: 1,
                    numbersPacked: 0x401B,
                    roundsBought: 1,
                    firstDrawId: 1
                }
            ];
            
            const result = await consolidatorService.generateMerkleTree(tickets);
            
            expect(result.root).toBeDefined();
            expect(result.leaves).toHaveLength(1);
            expect(result.proofs['1']).toBeDefined();
            
            // Verificar que o proof é válido
            const isValid = MerkleTree.verifyProof(
                result.leaves[0],
                result.proofs['1'],
                result.root
            );
            expect(isValid).toBe(true);
        });
    });

    describe('calculateWinners', () => {
        it('should correctly identify winning tickets', async () => {
            const drawId = 1;
            const winningNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            
            // Mock tickets with various match counts
            const mockTickets = [
                { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }, // 15 matches
                { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16] }, // 14 matches
                { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17] }  // 13 matches
            ];
            
            jest.spyOn(consolidatorService, 'getConsolidatedTickets').mockResolvedValue(mockTickets);
            
            const winners = await consolidatorService.calculateWinners(drawId, winningNumbers);
            
            expect(winners.tier1).toHaveLength(1); // 15 matches
            expect(winners.tier2).toHaveLength(1); // 14 matches  
            expect(winners.tier3).toHaveLength(1); // 13 matches
        });
    });
});
```

### 2.2 Utils Tests
**Arquivo**: `unit/backend/utils/NumberPacking.test.ts`

```typescript
import { NumberPacking } from '../../../backend/src/utils/NumberPacking';

describe('NumberPacking', () => {
    describe('Lotofácil', () => {
        it('should pack numbers correctly', () => {
            const numbers = [1, 2, 3, 5, 15];
            const packed = NumberPacking.packLotofacil(numbers);
            
            // Verificar bitmask correto
            expect(packed).toBe(0x401B); // 1<<0 + 1<<1 + 1<<2 + 1<<4 + 1<<14
        });

        it('should unpack numbers correctly', () => {
            const packed = 0x401B;
            const numbers = NumberPacking.unpackLotofacil(packed);
            
            expect(numbers).toEqual([1, 2, 3, 5, 15]);
        });

        it('should validate Lotofácil selections', () => {
            expect(NumberPacking.validateLotofasilNumbers([1, 2, 3])).toBe(false); // Too few
            expect(NumberPacking.validateLotofasilNumbers(Array.from({length: 16}, (_, i) => i + 1))).toBe(false); // Too many
            expect(NumberPacking.validateLotofasilNumbers([1, 2, 3, 26])).toBe(false); // Invalid number
            
            const valid = Array.from({length: 15}, (_, i) => i + 1);
            expect(NumberPacking.validateLotofasilNumbers(valid)).toBe(true);
        });
    });

    describe('SuperSete', () => {
        it('should pack columns correctly', () => {
            const columns = [3, 0, 9, 7, 1, 2, 4];
            const packed = NumberPacking.packSupersete(columns);
            
            // Verificar packing: (4<<24) | (2<<20) | (1<<16) | (7<<12) | (9<<8) | (0<<4) | (3<<0)
            const expected = (4 << 24) | (2 << 20) | (1 << 16) | (7 << 12) | (9 << 8) | (0 << 4) | (3 << 0);
            expect(packed).toBe(expected);
        });

        it('should unpack columns correctly', () => {
            const packed = (4 << 24) | (2 << 20) | (1 << 16) | (7 << 12) | (9 << 8) | (0 << 4) | (3 << 0);
            const columns = NumberPacking.unpackSupersete(packed);
            
            expect(columns).toEqual([3, 0, 9, 7, 1, 2, 4]);
        });
    });
});
```

### 2.3 MerkleTree Tests
**Arquivo**: `unit/backend/utils/MerkleTree.test.ts`

```typescript
import { MerkleTree } from '../../../backend/src/utils/MerkleTree';

describe('MerkleTree', () => {
    describe('generateLeafHash', () => {
        it('should generate consistent leaf hashes', () => {
            const ticket = {
                ticketId: '1',
                owner: '0x1234567890123456789012345678901234567890',
                game: 1,
                numbersPacked: 0x401B,
                roundsBought: 1,
                firstDrawId: 1
            };
            
            const hash1 = MerkleTree.generateLeafHash(ticket);
            const hash2 = MerkleTree.generateLeafHash(ticket);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toMatch(/^0x[0-9a-f]{64}$/i);
        });
    });

    describe('buildTree', () => {
        it('should build valid Merkle tree', () => {
            const leaves = ['0xaaa...', '0xbbb...', '0xccc...', '0xddd...'];
            
            const result = MerkleTree.buildTree(leaves);
            
            expect(result.root).toBeDefined();
            expect(result.tree).toBeDefined();
            expect(Object.keys(result.proofs)).toHaveLength(4);
            
            // Verificar que todos os proofs são válidos
            leaves.forEach(leaf => {
                const isValid = MerkleTree.verifyProof(leaf, result.proofs[leaf], result.root);
                expect(isValid).toBe(true);
            });
        });
    });
});
```

## 3. Testes Unitários de Frontend

### 3.1 Component Tests
**Arquivo**: `unit/frontend/components/NumberSelector.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberSelector } from '../../../frontend/src/components/game/NumberSelector';

describe('NumberSelector', () => {
    const defaultProps = {
        min: 1,
        max: 25,
        select: 15,
        gameType: 'LOTOFACIL' as const,
        onSelectionChange: jest.fn()
    };

    it('should render all numbers', () => {
        render(<NumberSelector {...defaultProps} />);
        
        for (let i = 1; i <= 25; i++) {
            expect(screen.getByText(i.toString())).toBeInTheDocument();
        }
    });

    it('should allow selecting up to 15 numbers', () => {
        const onSelectionChange = jest.fn();
        render(<NumberSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
        
        // Select 15 numbers
        for (let i = 1; i <= 15; i++) {
            fireEvent.click(screen.getByText(i.toString()));
        }
        
        expect(onSelectionChange).toHaveBeenLastCalledWith(
            expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        );
    });

    it('should prevent selecting more than 15 numbers', () => {
        render(<NumberSelector {...defaultProps} />);
        
        // Select 15 numbers
        for (let i = 1; i <= 15; i++) {
            fireEvent.click(screen.getByText(i.toString()));
        }
        
        // Try to select 16th number
        const button16 = screen.getByText('16');
        fireEvent.click(button16);
        
        expect(button16).toBeDisabled();
    });

    it('should support quick pick', () => {
        const onSelectionChange = jest.fn();
        render(<NumberSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
        
        const quickPickButton = screen.getByText('Surpresinha');
        fireEvent.click(quickPickButton);
        
        expect(onSelectionChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.any(Number)])
        );
        expect(onSelectionChange.mock.calls[0][0]).toHaveLength(15);
    });
});
```

### 3.2 Hook Tests
**Arquivo**: `unit/frontend/hooks/useBuyTicket.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBuyTicket } from '../../../frontend/src/hooks/useBuyTicket';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
    const queryClient = new QueryClient();
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useBuyTicket', () => {
    it('should handle successful ticket purchase', async () => {
        const { result } = renderHook(() => useBuyTicket(), {
            wrapper: createWrapper()
        });
        
        const mockParams = {
            game: 1,
            numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            roundsBought: 1,
            firstDrawId: 1,
            maxPaymentAmount: '0.1',
            paymentAmount: '0.05'
        };
        
        await act(async () => {
            await result.current.mutateAsync(mockParams);
        });
        
        expect(result.current.isSuccess).toBe(true);
    });

    it('should handle purchase errors', async () => {
        const { result } = renderHook(() => useBuyTicket(), {
            wrapper: createWrapper()
        });
        
        const invalidParams = {
            game: 1,
            numbers: [1, 2, 3], // Too few numbers
            roundsBought: 1,
            firstDrawId: 1,
            maxPaymentAmount: '0.1',
            paymentAmount: '0.05'
        };
        
        await act(async () => {
            try {
                await result.current.mutateAsync(invalidParams);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
        
        expect(result.current.isError).toBe(true);
    });
});
```

## 4. Testes de Integração

### 4.1 API Integration Tests
**Arquivo**: `integration/api/tickets.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../backend/src/app';

describe('Tickets API', () => {
    describe('GET /api/tickets/user/:address', () => {
        it('should return user tickets', async () => {
            const address = '0x1234567890123456789012345678901234567890';
            
            const response = await request(app)
                .get(`/api/tickets/user/${address}`)
                .expect(200);
                
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('owner', address);
        });
    });

    describe('GET /api/tickets/:ticketId/proof', () => {
        it('should return winning proof for valid winning ticket', async () => {
            const ticketId = 'winning-ticket-id';
            
            const response = await request(app)
                .get(`/api/tickets/${ticketId}/proof`)
                .expect(200);
                
            expect(response.body).toHaveProperty('proof');
            expect(response.body).toHaveProperty('tier');
            expect(response.body.proof).toBeInstanceOf(Array);
        });

        it('should return 404 for non-winning ticket', async () => {
            const ticketId = 'non-winning-ticket-id';
            
            await request(app)
                .get(`/api/tickets/${ticketId}/proof`)
                .expect(404);
        });
    });
});
```

### 4.2 Blockchain Integration Tests
**Arquivo**: `integration/blockchain/full-flow.test.js`

```javascript
describe('Full Draw Flow Integration', () => {
    it('should complete full draw lifecycle', async () => {
        // 1. Create draw
        const createDrawTx = await cryptoDraw.createDraw(1, scheduledTimestamp);
        await createDrawTx.wait();
        
        // 2. Buy tickets
        const buyTx1 = await cryptoDraw.connect(user1).buyTicket(/* params */);
        const buyTx2 = await cryptoDraw.connect(user2).buyTicket(/* params */);
        await buyTx1.wait();
        await buyTx2.wait();
        
        // 3. Wait for cutoff
        await time.increaseTo(cutoffTimestamp);
        
        // 4. Consolidate (simulate off-chain process)
        const consolidationTx = await cryptoDraw.connect(consolidator)
            .consolidateDraw(drawId, merkleRoot, totalPool);
        await consolidationTx.wait();
        
        // 5. Request randomness
        const randomnessTx = await cryptoDraw.requestRandomness(drawId);
        await randomnessTx.wait();
        
        // 6. Fulfill randomness (simulate VRF)
        const fulfillTx = await vrfCoordinator.fulfillRandomness(requestId, randomValue);
        await fulfillTx.wait();
        
        // 7. Claim prizes
        const claimTx = await cryptoDraw.connect(winner)
            .claimPrize(ticketId, merkleProof, expectedTier);
        await claimTx.wait();
        
        // Verify final state
        const draw = await cryptoDraw.draws(drawId);
        expect(draw.status).to.equal(6); // SETTLED
    });
});
```

## 5. Testes End-to-End

### 5.1 User Flow Tests
**Arquivo**: `e2e/user-flows/ticket-purchase.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Ticket Purchase Flow', () => {
    test('should allow complete ticket purchase', async ({ page }) => {
        // 1. Navigate to Lotofácil page
        await page.goto('/lotofacil');
        
        // 2. Connect wallet
        await page.click('[data-testid="connect-wallet"]');
        await page.click('[data-testid="metamask-connector"]');
        
        // 3. Select numbers
        for (let i = 1; i <= 15; i++) {
            await page.click(`[data-testid="number-${i}"]`);
        }
        
        // 4. Choose rounds
        await page.selectOption('[data-testid="rounds-selector"]', '3');
        
        // 5. Purchase ticket
        await page.click('[data-testid="purchase-button"]');
        
        // 6. Confirm transaction
        await page.click('[data-testid="confirm-transaction"]');
        
        // 7. Wait for confirmation
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        
        // 8. Verify ticket appears in user's tickets
        await page.goto('/tickets');
        await expect(page.locator('[data-testid="ticket-card"]')).toBeVisible();
    });

    test('should prevent invalid number selections', async ({ page }) => {
        await page.goto('/lotofacil');
        
        // Try to select only 10 numbers
        for (let i = 1; i <= 10; i++) {
            await page.click(`[data-testid="number-${i}"]`);
        }
        
        // Purchase button should be disabled
        await expect(page.locator('[data-testid="purchase-button"]')).toBeDisabled();
        
        // Error message should be visible
        await expect(page.locator('[data-testid="error-message"]'))
            .toContainText('Selecione exatamente 15 números');
    });
});
```

### 5.2 Prize Claim Tests
**Arquivo**: `e2e/user-flows/prize-claim.spec.ts`

```typescript
test.describe('Prize Claim Flow', () => {
    test('should allow claiming winning prize', async ({ page }) => {
        // Setup: ensure user has winning ticket
        await setupWinningTicket();
        
        // 1. Navigate to tickets page
        await page.goto('/tickets');
        
        // 2. Find winning ticket
        const winningTicket = page.locator('[data-testid="winning-ticket"]');
        await expect(winningTicket).toBeVisible();
        
        // 3. Click claim button
        await winningTicket.locator('[data-testid="claim-button"]').click();
        
        // 4. Confirm claim transaction
        await page.click('[data-testid="confirm-claim"]');
        
        // 5. Wait for success
        await expect(page.locator('[data-testid="claim-success"]')).toBeVisible();
        
        // 6. Verify prize credited
        await expect(page.locator('[data-testid="balance-updated"]')).toBeVisible();
    });
});
```

## 6. Performance Tests

### 6.1 Load Tests
**Arquivo**: `e2e/performance/load.test.ts`

```typescript
import { test } from '@playwright/test';

test.describe('Performance Tests', () => {
    test('should handle concurrent ticket purchases', async ({ browser }) => {
        const promises = Array.from({ length: 10 }, async (_, i) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            
            // Simulate concurrent purchases
            await page.goto('/lotofacil');
            await purchaseTicket(page, i);
            
            await context.close();
        });
        
        await Promise.all(promises);
    });

    test('should load results page quickly', async ({ page }) => {
        const start = Date.now();
        
        await page.goto('/results');
        await page.waitForSelector('[data-testid="results-loaded"]');
        
        const loadTime = Date.now() - start;
        expect(loadTime).toBeLessThan(3000); // 3 seconds
    });
});
```

## 7. Test Fixtures e Mocks

### 7.1 Contract Fixtures
**Arquivo**: `unit/fixtures/contractFixtures.js`

```javascript
const contractFixtures = {
    async deployContracts() {
        const [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy all contracts
        const CryptoDraw = await ethers.getContractFactory("CryptoDraw");
        const cryptoDraw = await CryptoDraw.deploy();
        
        const TicketNFT = await ethers.getContractFactory("TicketNFT");
        const ticketNFT = await TicketNFT.deploy(cryptoDraw.address);
        
        return { cryptoDraw, ticketNFT, owner, user1, user2 };
    },

    generateMockTickets(count = 10) {
        return Array.from({ length: count }, (_, i) => ({
            ticketId: (i + 1).toString(),
            owner: `0x${'1'.repeat(40)}`,
            game: 1,
            numbers: Array.from({ length: 15 }, (_, j) => (j + 1)),
            numbersPacked: 0x1FFFFFF,
            roundsBought: 1,
            firstDrawId: 1
        }));
    }
};

module.exports = contractFixtures;
```

## 8. Configurações de Teste

### 8.1 Jest Config
**Arquivo**: `jest.config.js`

```javascript
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/*.(test|spec).+(ts|tsx|js)'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    collectCoverageFrom: [
        'backend/src/**/*.{ts,tsx}',
        'frontend/src/**/*.{ts,tsx}',
        '!**/*.d.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### 8.2 Playwright Config
**Arquivo**: `playwright.config.ts`

```typescript
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
    ],
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
    },
});
```

## Checklist de Implementação

### Testes Unitários
- [ ] Todos os contratos Solidity
- [ ] Services do backend
- [ ] Utilitários (packing, merkle)
- [ ] Componentes React
- [ ] Custom hooks
- [ ] Stores Zustand

### Testes de Integração
- [ ] API endpoints
- [ ] Database operations
- [ ] Blockchain interactions
- [ ] Frontend-backend integration

### Testes E2E
- [ ] Fluxo completo de compra
- [ ] Claim de prêmios
- [ ] Navegação da aplicação
- [ ] Wallet connection
- [ ] Error handling

### Performance
- [ ] Load testing
- [ ] Gas optimization
- [ ] Frontend performance
- [ ] API response times

### Coverage
- [ ] 80%+ code coverage
- [ ] Critical paths 100%
- [ ] Edge cases cobertos
- [ ] Security scenarios

### CI/CD
- [ ] Automated testing
- [ ] Coverage reports
- [ ] Performance monitoring
- [ ] Security scanning