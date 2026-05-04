# Arquitetura Unificada CryptoDraw

## 📋 Estrutura Reorganizada

Com a nova organização em `src/`, o projeto agora segue uma arquitetura modular que promove compartilhamento de código entre frontend e backend:

```
src/
├── frontend/              # Aplicação Vite + React
│   ├── src/
│   │   ├── app/          # Pages/Routes
│   │   ├── components/   # Componentes específicos do frontend
│   │   ├── stores/       # Zustand stores
│   │   ├── hooks/        # Hooks específicos do frontend
│   │   └── lib/          # Configurações específicas (Wagmi, etc.)
│   ├── index.html
│   └── vite.config.ts
│
├── backend/               # API Node.js + Express
│   ├── controllers/      # REST Controllers
│   ├── services/         # Business Logic
│   ├── jobs/            # Background Jobs
│   ├── middleware/      # Express Middleware
│   ├── config/          # Configurações específicas do backend
│   ├── prisma/          # Database Schema
│   └── tests/           # Testes do backend
│
├── components/            # 🔄 COMPARTILHADO: Componentes React
├── hooks/                # 🔄 COMPARTILHADO: Custom Hooks
├── utils/                # 🔄 COMPARTILHADO: Utilitários
├── models/               # 🔄 COMPARTILHADO: Modelos de dados
├── services/             # 🔄 COMPARTILHADO: Services blockchain
├── types/                # 🔄 COMPARTILHADO: Tipos TypeScript
└── config.json          # Configuração geral do projeto
```

## 🔄 Código Compartilhado

### 1. **Modelos de Dados** (`src/models/`)
Tipos e interfaces usados tanto no frontend quanto no backend:

```typescript
// src/models/Ticket.ts
export interface Ticket {
    id: string;
    owner: string;
    game: GameType;
    numbers: number[];
    // ... usado em ambos frontend e backend
}
```

### 2. **Utilitários** (`src/utils/`)
Funções compartilhadas como packing de números:

```typescript
// src/utils/NumberPacking.ts
export class NumberPacking {
    static packLotofacil(numbers: number[]): number
    static unpackLotofacil(packed: number): number[]
    // ... usado por frontend (UI) e backend (consolidação)
}
```

### 3. **Services Blockchain** (`src/services/`)
Interações com contratos inteligentes:

```typescript
// src/services/BlockchainService.ts
export class BlockchainService {
    async getTicket(ticketId: string): Promise<Ticket>
    // ... usado por frontend (UI) e backend (indexação)
}
```

### 4. **Hooks Compartilhados** (`src/hooks/`)
React hooks que podem ser usados em diferentes contextos:

```typescript
// src/hooks/useContract.ts
export function useContract(address: string, abi: any) {
    // ... lógica de conexão com contrato
    // Usado tanto no frontend quanto em ferramentas admin
}
```

### 5. **Componentes Reutilizáveis** (`src/components/`)
Componentes React que podem ser usados em diferentes apps:

```typescript
// src/components/NumberSelector.tsx
export function NumberSelector({ gameType, onSelect }: Props) {
    // ... componente usado no frontend principal e em ferramentas admin
}
```

## 📁 Organização por Responsabilidade

### Frontend Específico (`src/frontend/`)
- **Pages/Routes**: Estrutura de navegação da aplicação
- **UI Components**: Componentes específicos de layout e design
- **Stores**: Estado específico da aplicação (Zustand)
- **Configurações**: Wagmi, Vite, styling específico

### Backend Específico (`src/backend/`)
- **API Controllers**: Endpoints REST específicos
- **Business Logic**: Lógica de negócio do servidor
- **Database**: Schema Prisma e migrations
- **Jobs**: Background jobs e cron tasks

### Compartilhado (`src/`)
- **Business Models**: Definições de dados do domínio
- **Blockchain Logic**: Interação com smart contracts
- **Validation**: Regras de validação de dados
- **Utilities**: Funções helper reutilizáveis

## 🔧 Benefícios da Nova Arquitetura

### ✅ **Reutilização de Código**
- Modelos de dados consistentes entre frontend/backend
- Lógica de validação compartilhada
- Utilitários de blockchain únicos

### ✅ **Manutenção Simplificada**
- Mudanças em modelos refletem automaticamente em ambos os lados
- Bugs corrigidos uma vez beneficiam todo o sistema
- Testes compartilhados garantem consistência

### ✅ **Desenvolvimento Eficiente**
- Times frontend/backend podem trabalhar com as mesmas definições
- Evita duplicação de código e lógica
- Facilita onboarding de novos desenvolvedores

### ✅ **Tipagem Consistente**
- TypeScript compartilhado entre frontend/backend
- Interfaces de API automaticamente tipadas
- Detecção precoce de incompatibilidades

## 📋 Diretrizes de Desenvolvimento

### 🎯 **Quando Usar Código Compartilhado**
- **Modelos de dados**: Sempre compartilhar
- **Validação**: Regras de negócio devem ser compartilhadas
- **Utilitários**: Funções puras sem dependências específicas
- **Tipos**: Interfaces e enums sempre compartilhados

### 🎯 **Quando Usar Código Específico**
- **UI Components**: Componentes com dependências de UI framework
- **API Routes**: Lógica específica de servidor
- **Database Queries**: Operações específicas de persistência
- **Build Config**: Configurações de build específicas

### 🔄 **Fluxo de Trabalho**

1. **Definir Modelos** em `src/models/`
2. **Criar Utilitários** em `src/utils/` 
3. **Implementar Services** em `src/services/`
4. **Desenvolver Frontend** em `src/frontend/`
5. **Desenvolver Backend** em `src/backend/`

## 🚀 **Próximos Passos**

1. **Migrar código existente** para estrutura compartilhada
2. **Configurar build system** para compilação cruzada
3. **Implementar testes** para código compartilhado
4. **Documentar APIs** compartilhadas
5. **Configurar CI/CD** para ambos frontend e backend

Esta arquitetura posiciona o CryptoDraw para crescimento escalável mantendo consistência e qualidade de código em todo o sistema! 🎯