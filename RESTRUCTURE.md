# Estrutura Reorganizada do CryptoDraw

## 📁 Nova Organização

O projeto foi reorganizado para unificar todo o código fonte em `src/`, seguindo as melhores práticas:

```
CryptoDraw/
├── src/
│   ├── frontend/          # Aplicação React/Vite (movido de /frontend)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── README.md
│   ├── backend/           # API/Backend (movido de /backend)
│   │   └── README.md
│   ├── components/        # Componentes React compartilhados
│   ├── hooks/            # React hooks customizados
│   ├── pages/            # Páginas da aplicação
│   ├── services/         # Serviços de integração blockchain
│   ├── utils/            # Utilitários compartilhados
│   ├── controllers/      # Controllers do backend
│   ├── models/           # Modelos de dados
│   ├── config.json       # Configuração do projeto
│   ├── FRONTEND.md       # Documentação do frontend
│   └── BACKEND.md        # Documentação do backend
├── contracts/            # Smart contracts Solidity
├── scripts/              # Scripts de deploy e interação
├── config/               # Configurações do Hardhat
├── libs/                 # Bibliotecas compartilhadas
├── docs/                 # Documentação VitePress
├── tests/                # Testes automatizados
├── infrastructure/       # Configurações de infraestrutura
└── public/               # Assets públicos
```

## 🔄 Mudanças nos Scripts

Os scripts do `package.json` foram atualizados para refletir a nova estrutura:

### Scripts Frontend (atualizados)
```bash
npm run dev:frontend      # cd src/frontend && vite
npm run build:frontend    # cd src/frontend && vite build
npm run preview:frontend  # cd src/frontend && vite preview
npm run start:frontend    # cd src/frontend && npm run dev
```

### Scripts Backend (atualizados)
```bash
npm run start:backend     # cd src/backend && npm start
```

### Scripts de Desenvolvimento
```bash
npm run dev              # Executa node + backend + frontend concorrentemente
```

## 📝 Vite Config Atualizado

O `vite.config.ts` foi atualizado com novos aliases para a estrutura reorganizada:

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),           // Frontend src
    '@contracts': resolve(__dirname, '../../contracts'),
    '@libs': resolve(__dirname, '../../libs'),
    '@backend': resolve(__dirname, '../backend'),
    '@config': resolve(__dirname, '../../config'),
  },
}
```

## 🚀 Próximos Passos

1. **Instalar dependências do frontend:**
   ```bash
   cd src/frontend
   npm init -y  # Criar package.json específico
   npm install  # Instalar dependências
   ```

2. **Configurar estrutura de componentes:**
   - Mover componentes para `src/components/`
   - Criar páginas em `src/pages/`
   - Implementar hooks em `src/hooks/`

3. **Integração com contratos:**
   - Services em `src/services/` para interação blockchain
   - Utils em `src/utils/` para helpers

4. **Atualizar orientações de desenvolvimento:**
   - `BACKEND.md` e `FRONTEND.md` atualizados para nova estrutura
   - `ARCHITECTURE.md` criado com diretrizes da arquitetura unificada
   - Código compartilhado vs específico documentado

## 📋 Benefícios da Reorganização

- ✅ **Código unificado** em `src/`
- ✅ **Melhor organização** de assets
- ✅ **Compartilhamento** de código entre frontend/backend
- ✅ **Paths mais limpos** com aliases
- ✅ **Estrutura escalável** para crescimento do projeto
- ✅ **Padrão da indústria** seguido
- ✅ **Arquitetura modular** documentada
- ✅ **Orientações atualizadas** para nova estrutura

## 🔧 Configuração de Desenvolvimento

Para trabalhar com a nova estrutura:

1. **Frontend:** `npm run dev:frontend`
2. **Backend:** `npm run start:backend` 
3. **Full stack:** `npm run dev`
4. **Build:** `npm run build:frontend`

A reorganização mantém toda a funcionalidade existente enquanto melhora a organização e escalabilidade do projeto.