# Frontend Web App - CryptoDraw

## Instruções para o Copilot Agent

Este diretório implementa a interface web do CryptoDraw usando React/Next.js, fornecendo uma experiência de usuário completa para participar das loterias on-chain.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **Wallet Connection**: Rainbow Kit + Wagmi
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts para estatísticas
- **Animation**: Framer Motion
- **Testing**: Jest + React Testing Library

## Estrutura de Arquivos

```
frontend/
├── src/
│   ├── app/                 # App Router (Next.js 14)
│   ├── components/          # Componentes React
│   │   ├── ui/             # Componentes base (shadcn)
│   │   ├── game/           # Componentes específicos dos jogos
│   │   ├── wallet/         # Componentes de wallet
│   │   └── layout/         # Layout components
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand stores
│   ├── utils/              # Utilitários
│   ├── types/              # Tipos TypeScript
│   └── lib/                # Configurações libs
├── public/                 # Assets estáticos
└── styles/                 # Estilos globais
```

## Páginas Principais

### 1. Home Page (`/`)
**Arquivo**: `src/app/page.tsx`

```tsx
// Landing page com overview dos jogos
export default function HomePage() {
    return (
        <div>
            <Hero />
            <GameSelector />
            <RecentDraws />
            <Statistics />
        </div>
    );
}
```

### 2. Lotofácil (`/lotofacil`)
**Arquivo**: `src/app/lotofacil/page.tsx`

```tsx
export default function LotofacilPage() {
    return (
        <div>
            <GameHeader game="LOTOFACIL" />
            <NumberSelector 
                min={1} 
                max={25} 
                select={15} 
                gameType="LOTOFACIL" 
            />
            <TicketPurchase />
            <NextDraw />
        </div>
    );
}
```

### 3. SuperSete (`/supersete`)
**Arquivo**: `src/app/supersete/page.tsx`

```tsx
export default function SupersetePage() {
    return (
        <div>
            <GameHeader game="SUPERSETE" />
            <ColumnSelector columns={7} />
            <TicketPurchase />
            <NextDraw />
        </div>
    );
}
```

### 4. Meus Tickets (`/tickets`)
**Arquivo**: `src/app/tickets/page.tsx`

```tsx
export default function TicketsPage() {
    return (
        <div>
            <TicketFilters />
            <TicketList />
            <WinningTickets />
        </div>
    );
}
```

### 5. Resultados (`/results`)
**Arquivo**: `src/app/results/page.tsx`

```tsx
export default function ResultsPage() {
    return (
        <div>
            <DrawSelector />
            <DrawResults />
            <WinnersList />
            <StatisticsPanel />
        </div>
    );
}
```

## Componentes Principais

### 1. Game Components

#### 1.1 NumberSelector
**Arquivo**: `src/components/game/NumberSelector.tsx`

```tsx
interface NumberSelectorProps {
    min: number;
    max: number;
    select: number;
    gameType: GameType;
    onSelectionChange: (numbers: number[]) => void;
}

export function NumberSelector({ min, max, select, gameType, onSelectionChange }: NumberSelectorProps) {
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    
    // Grid de números clicáveis
    // Validação de seleção
    // Quick picks (seleção automática)
    // Visualização de padrões
}
```

#### 1.2 ColumnSelector (SuperSete)
**Arquivo**: `src/components/game/ColumnSelector.tsx`

```tsx
interface ColumnSelectorProps {
    columns: number;
    onSelectionChange: (columns: number[]) => void;
}

export function ColumnSelector({ columns, onSelectionChange }: ColumnSelectorProps) {
    const [selectedColumns, setSelectedColumns] = useState<number[]>(new Array(columns).fill(0));
    
    // 7 colunas com dígitos 0-9
    // Validação por coluna
    // Quick pick por coluna
}
```

#### 1.3 TicketPurchase
**Arquivo**: `src/components/game/TicketPurchase.tsx`

```tsx
export function TicketPurchase() {
    const { selectedNumbers } = useGameStore();
    const { buyTicket, isPending } = useBuyTicket();
    
    return (
        <div>
            <RoundSelector />
            <PaymentMethod />
            <PriceCalculator />
            <PurchaseButton onClick={() => buyTicket()} />
            <TransactionStatus />
        </div>
    );
}
```

### 2. Wallet Components

#### 2.1 WalletConnection
**Arquivo**: `src/components/wallet/WalletConnection.tsx`

```tsx
export function WalletConnection() {
    const { address, isConnected } = useAccount();
    
    if (!isConnected) {
        return <ConnectButton />;
    }
    
    return (
        <div>
            <WalletInfo address={address} />
            <NetworkSelector />
            <DisconnectButton />
        </div>
    );
}
```

#### 2.2 NetworkSelector
**Arquivo**: `src/components/wallet/NetworkSelector.tsx`

```tsx
export function NetworkSelector() {
    const { chain, chains } = useNetwork();
    const { switchNetwork } = useSwitchNetwork();
    
    return (
        <Select value={chain?.id} onValueChange={switchNetwork}>
            {chains.map(network => (
                <SelectItem key={network.id} value={network.id}>
                    {network.name}
                </SelectItem>
            ))}
        </Select>
    );
}
```

### 3. Ticket Components

#### 3.1 TicketCard
**Arquivo**: `src/components/ticket/TicketCard.tsx`

```tsx
interface TicketCardProps {
    ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
    return (
        <Card>
            <CardHeader>
                <GameBadge game={ticket.game} />
                <TicketStatus status={ticket.status} />
            </CardHeader>
            <CardContent>
                <SelectedNumbers numbers={ticket.numbers} />
                <DrawInfo drawId={ticket.firstDrawId} />
                <RoundsRemaining remaining={ticket.roundsRemaining} />
            </CardContent>
            <CardActions>
                {ticket.status === 'WON' && <ClaimButton ticketId={ticket.id} />}
                <ShareButton ticket={ticket} />
            </CardActions>
        </Card>
    );
}
```

#### 3.2 ClaimButton
**Arquivo**: `src/components/ticket/ClaimButton.tsx`

```tsx
interface ClaimButtonProps {
    ticketId: string;
}

export function ClaimButton({ ticketId }: ClaimButtonProps) {
    const { claimPrize, isPending } = useClaimPrize();
    const { data: proofData } = useWinningProof(ticketId);
    
    const handleClaim = async () => {
        if (!proofData) return;
        
        await claimPrize({
            ticketId,
            merkleProof: proofData.proof,
            expectedTier: proofData.tier
        });
    };
    
    return (
        <Button onClick={handleClaim} loading={isPending}>
            Resgatar Prêmio
        </Button>
    );
}
```

### 4. Results Components

#### 4.1 DrawResults
**Arquivo**: `src/components/results/DrawResults.tsx`

```tsx
interface DrawResultsProps {
    drawId: number;
}

export function DrawResults({ drawId }: DrawResultsProps) {
    const { data: draw, isLoading } = useDraw(drawId);
    
    if (isLoading) return <DrawResultsSkeleton />;
    if (!draw?.winningNumbers) return <NoResults />;
    
    return (
        <div>
            <WinningNumbers numbers={draw.winningNumbers} game={draw.game} />
            <PrizeBreakdown results={draw.results} />
            <DrawStatistics draw={draw} />
        </div>
    );
}
```

#### 4.2 StatisticsPanel
**Arquivo**: `src/components/results/StatisticsPanel.tsx`

```tsx
export function StatisticsPanel() {
    const { data: stats } = useGameStatistics();
    
    return (
        <div>
            <NumberFrequency data={stats?.frequency} />
            <HotAndColdNumbers data={stats?.trends} />
            <HistoricalResults data={stats?.history} />
        </div>
    );
}
```

## Custom Hooks

### 1. Game Hooks

#### 1.1 useBuyTicket
**Arquivo**: `src/hooks/useBuyTicket.ts`

```typescript
export function useBuyTicket() {
    const { writeAsync: buyTicket } = useContractWrite({
        address: CRYPTODRAW_ADDRESS,
        abi: CryptoDrawABI,
        functionName: 'buyTicket'
    });
    
    return useMutation({
        mutationFn: async (params: BuyTicketParams) => {
            const packedNumbers = packNumbers(params.numbers, params.game);
            
            return await buyTicket({
                args: [
                    params.game,
                    packedNumbers,
                    params.roundsBought,
                    params.firstDrawId,
                    params.maxPaymentAmount
                ],
                value: params.paymentAmount
            });
        },
        onSuccess: (txHash) => {
            toast.success('Ticket comprado com sucesso!');
            // Invalidate queries
        },
        onError: (error) => {
            toast.error('Erro ao comprar ticket');
        }
    });
}
```

#### 1.2 useClaimPrize
**Arquivo**: `src/hooks/useClaimPrize.ts`

```typescript
export function useClaimPrize() {
    const { writeAsync: claimPrize } = useContractWrite({
        address: CRYPTODRAW_ADDRESS,
        abi: CryptoDrawABI,
        functionName: 'claimPrize'
    });
    
    return useMutation({
        mutationFn: async (params: ClaimPrizeParams) => {
            return await claimPrize({
                args: [
                    params.ticketId,
                    params.merkleProof,
                    params.expectedTier
                ]
            });
        },
        onSuccess: () => {
            toast.success('Prêmio resgatado com sucesso!');
        }
    });
}
```

### 2. Data Hooks

#### 2.1 useUserTickets
**Arquivo**: `src/hooks/useUserTickets.ts`

```typescript
export function useUserTickets(address?: string) {
    return useQuery({
        queryKey: ['user-tickets', address],
        queryFn: async () => {
            if (!address) return [];
            
            const response = await fetch(`/api/tickets/user/${address}`);
            return response.json();
        },
        enabled: !!address
    });
}
```

#### 2.2 useDraw
**Arquivo**: `src/hooks/useDraw.ts`

```typescript
export function useDraw(drawId: number) {
    return useQuery({
        queryKey: ['draw', drawId],
        queryFn: async () => {
            const response = await fetch(`/api/draws/${drawId}`);
            return response.json();
        }
    });
}
```

## State Management

### 1. Game Store
**Arquivo**: `src/stores/gameStore.ts`

```typescript
interface GameState {
    selectedNumbers: number[];
    selectedGame: GameType;
    roundsBought: number;
    paymentMethod: 'ETH' | 'USDC';
}

interface GameActions {
    setSelectedNumbers: (numbers: number[]) => void;
    setSelectedGame: (game: GameType) => void;
    setRoundsBought: (rounds: number) => void;
    clearSelection: () => void;
}

export const useGameStore = create<GameState & GameActions>((set) => ({
    selectedNumbers: [],
    selectedGame: 'LOTOFACIL',
    roundsBought: 1,
    paymentMethod: 'ETH',
    
    setSelectedNumbers: (numbers) => set({ selectedNumbers: numbers }),
    setSelectedGame: (game) => set({ selectedGame: game }),
    setRoundsBought: (rounds) => set({ roundsBought: rounds }),
    clearSelection: () => set({ selectedNumbers: [] })
}));
```

### 2. Wallet Store
**Arquivo**: `src/stores/walletStore.ts`

```typescript
interface WalletState {
    isConnecting: boolean;
    pendingTransactions: string[];
}

interface WalletActions {
    addPendingTransaction: (txHash: string) => void;
    removePendingTransaction: (txHash: string) => void;
}

export const useWalletStore = create<WalletState & WalletActions>((set) => ({
    isConnecting: false,
    pendingTransactions: [],
    
    addPendingTransaction: (txHash) => 
        set(state => ({ 
            pendingTransactions: [...state.pendingTransactions, txHash] 
        })),
    removePendingTransaction: (txHash) => 
        set(state => ({
            pendingTransactions: state.pendingTransactions.filter(tx => tx !== txHash)
        }))
}));
```

## Utilitários

### 1. Number Packing
**Arquivo**: `src/utils/numberPacking.ts`

```typescript
export const packNumbers = {
    lotofacil: (numbers: number[]): number => {
        let bitmask = 0;
        numbers.forEach(num => {
            bitmask |= (1 << (num - 1));
        });
        return bitmask;
    },
    
    supersete: (columns: number[]): number => {
        let packed = 0;
        columns.forEach((digit, index) => {
            packed |= (digit << (index * 4));
        });
        return packed;
    }
};

export const unpackNumbers = {
    lotofacil: (packed: number): number[] => {
        const numbers: number[] = [];
        for (let i = 0; i < 25; i++) {
            if (packed & (1 << i)) {
                numbers.push(i + 1);
            }
        }
        return numbers;
    },
    
    supersete: (packed: number): number[] => {
        const columns: number[] = [];
        for (let i = 0; i < 7; i++) {
            columns.push((packed >> (i * 4)) & 0xF);
        }
        return columns;
    }
};
```

### 2. Form Validation
**Arquivo**: `src/utils/validation.ts`

```typescript
export const gameValidation = {
    lotofacil: z.object({
        numbers: z.array(z.number().min(1).max(25))
            .length(15, 'Selecione exatamente 15 números')
            .refine(arr => new Set(arr).size === arr.length, 'Números devem ser únicos'),
        
        roundsBought: z.number().min(1).max(6),
    }),
    
    supersete: z.object({
        columns: z.array(z.number().min(0).max(9))
            .length(7, 'Selecione 7 colunas'),
        
        roundsBought: z.number().min(1).max(6),
    })
};
```

## Configurações

### 1. Wagmi Config
**Arquivo**: `src/lib/wagmi.ts`

```typescript
import { createConfig, configureChains, mainnet, goerli } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';

const { chains, publicClient, webSocketPublicClient } = configureChains(
    [mainnet, goerli],
    [publicProvider()]
);

const { connectors } = getDefaultWallets({
    appName: 'CryptoDraw',
    projectId: 'YOUR_PROJECT_ID',
    chains
});

export const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient
});
```

### 2. Contract Config
**Arquivo**: `src/lib/contracts.ts`

```typescript
export const CONTRACTS = {
    mainnet: {
        CRYPTODRAW_ADDRESS: '0x...',
        TICKET_NFT_ADDRESS: '0x...',
    },
    goerli: {
        CRYPTODRAW_ADDRESS: '0x...',
        TICKET_NFT_ADDRESS: '0x...',
    }
};

export const getCryptoDrawAddress = (chainId: number): string => {
    switch (chainId) {
        case 1: return CONTRACTS.mainnet.CRYPTODRAW_ADDRESS;
        case 5: return CONTRACTS.goerli.CRYPTODRAW_ADDRESS;
        default: throw new Error('Rede não suportada');
    }
};
```

## Responsividade e UX

### 1. Mobile-First Design
- Layout responsivo com breakpoints do Tailwind
- Componentes otimizados para touch
- Navigation drawer para mobile
- Modais adaptáveis

### 2. Loading States
- Skeletons para carregamento
- Progress indicators
- Loading spinners
- Error boundaries

### 3. Animations
- Framer Motion para transições
- Micro-interactions nos botões
- Animações de entrada/saída
- Loading animations

## Testes

### 1. Component Testing
```typescript
describe('NumberSelector', () => {
    it('should allow selecting exactly 15 numbers for Lotofácil', () => {
        render(<NumberSelector min={1} max={25} select={15} gameType="LOTOFACIL" />);
        
        // Test selection logic
        // Test validation
        // Test UI feedback
    });
});
```

### 2. Hook Testing
```typescript
describe('useBuyTicket', () => {
    it('should handle ticket purchase flow', async () => {
        // Mock contract interaction
        // Test success/error states
        // Test parameter validation
    });
});
```

## Checklist de Implementação

- [ ] Configurar Next.js 14 com App Router
- [ ] Instalar e configurar Tailwind + Shadcn
- [ ] Configurar Rainbow Kit + Wagmi
- [ ] Implementar páginas principais
- [ ] Criar componentes de jogo
- [ ] Implementar seletores de números
- [ ] Criar hooks de contrato
- [ ] Implementar stores Zustand
- [ ] Adicionar validação de forms
- [ ] Criar utilitários de packing
- [ ] Implementar wallet connection
- [ ] Adicionar claim functionality
- [ ] Criar páginas de resultados
- [ ] Implementar estatísticas
- [ ] Adicionar testes
- [ ] Configurar CI/CD
- [ ] Otimizar performance
- [ ] Adicionar PWA features