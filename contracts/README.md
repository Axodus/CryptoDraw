# Contratos Inteligentes - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém os contratos Solidity do sistema CryptoDraw. Você deve implementar e melhorar os seguintes contratos baseado na especificação técnica em `cryptodraw-spec.md`.

## Estrutura de Arquivos a Implementar

### 1. CryptoDraw.sol (Principal)
**Status: Parcialmente implementado - REQUER REVISÃO COMPLETA**

Implementar as seguintes funcionalidades conforme seção 2 e 5 da spec:
- Struct `Draw` com todos os campos da seção 2.2
- Struct `TicketMeta` para storage mínimo on-chain
- Mappings principais: `tickets`, `draws`, `withdrawableBalances`, `tierPoolAmounts`
- Função `buyTicket()` com assinatura exata da seção 5.1
- Função `consolidateDraw()` conforme seção 5.2
- Sistema de randomness com Chainlink VRF (seção 5.3)
- Função `claimPrize()` com validação Merkle proof (seção 5.4)
- Eventos da seção 8
- Errors customizados para economia de gas
- Modifiers de validação

### 2. TicketNFT.sol 
**Status: Existe mas precisa ser atualizado**

Implementar:
- ERC721 não-transferível (soulbound)
- Metadata dinâmica baseada no estado do ticket
- Integração com CryptoDraw.sol
- Sistema de expiração e queima (seção 9.1)
- Suporte a bolões (seção 9.2)

### 3. AgentProxy.sol
**Status: Existe mas função unclear**

Revisar e implementar:
- Proxy pattern se necessário para upgrades
- Ou remover se não for necessário
- Documentar propósito claramente

### 4. Novos Contratos Necessários

#### 4.1 PriceOracle.sol
```solidity
// Implementar oracle de preços para conversão USD
contract PriceOracle {
    function getUSDPrice(address token) external view returns (uint256);
    function convertToUSD(address token, uint256 amount) external view returns (uint256);
}
```

#### 4.2 PoolManager.sol
```solidity
// Gerenciamento de bolões conforme seção 9.2
contract PoolManager {
    struct Pool {
        uint256 poolId;
        address creator;
        uint256 totalShares;
        uint256 prizeAmount;
        bool settled;
    }
    
    function createPool() external returns (uint256 poolId);
    function joinPool(uint256 poolId) external payable;
    function settlePool(uint256 poolId, uint256 prizeAmount) external;
    function withdrawPoolShare(uint256 poolId) external;
}
```

#### 4.3 RandomnessProvider.sol
```solidity
// Wrapper para Chainlink VRF ou outros provedores
contract RandomnessProvider {
    function requestRandomness(uint32 drawId) external returns (bytes32 requestId);
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external;
}
```

## Requisitos Técnicos Específicos

### 1. Formatos de Dados (Seção 3)
- Implementar packing para Lotofácil: bitmask de 25 bits em uint32
- Implementar packing para SuperSete: 7 colunas * 4 bits = 28 bits
- Funções de pack/unpack para cada jogo
- Validação de números válidos

### 2. Merkle Proofs (Seção 4)
- Formato exato da leaf: `keccak256(abi.encodePacked(uint256(ticketId), address(owner), uint8(game), uint32(numbersPacked), uint8(roundsBought), uint32(firstDrawId)))`
- Validação de Merkle proofs usando biblioteca OpenZeppelin
- Proteção contra replay attacks

### 3. Algoritmos de Sorteio (Seção 10)
Implementar funções determinísticas:
```solidity
function deriveLotofacilWinning(uint256 randomness) internal pure returns (uint32 packed);
function deriveSuperseteWinning(uint256 randomness) internal pure returns (uint32 packed);
```

### 4. Otimizações de Gas
- Usar `error` ao invés de `require` strings
- Packed structs para reduzir storage slots
- Batch operations onde possível
- Pull pattern para withdrawals

### 5. Segurança
- ReentrancyGuard em funções críticas
- Access control com roles (OpenZeppelin)
- Input validation rigorosa
- Overflow protection (Solidity 0.8+)

## Padrões de Código

### 1. Convenções de Nomenclatura
- Contratos: PascalCase
- Funções: camelCase
- Variáveis: camelCase
- Constantes: UPPER_CASE
- Errors: PascalCase
- Events: PascalCase

### 2. Documentação
- NatSpec para todas as funções públicas
- Comentários explicativos para lógica complexa
- Exemplos de uso quando necessário

### 3. Imports
```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
```

## Testes Necessários
Criar testes em `../tests/unit/contracts/` para:
- Todas as funções públicas
- Edge cases de packing/unpacking
- Validação de Merkle proofs
- Simulação de sorteios
- Cenários de falha e segurança

## Deployment
- Scripts de deployment em `../scripts/`
- Configurações por rede (mainnet, testnet)
- Verificação automática de contratos
- Inicialização de parâmetros

## Checklist de Implementação
- [ ] Revisar CryptoDraw.sol contra especificação
- [ ] Implementar TicketNFT.sol completo
- [ ] Criar PriceOracle.sol
- [ ] Criar PoolManager.sol
- [ ] Criar RandomnessProvider.sol
- [ ] Implementar algoritmos de packing
- [ ] Implementar validação Merkle
- [ ] Algoritmos de sorteio determinísticos
- [ ] Eventos e errors completos
- [ ] Testes unitários 100% coverage
- [ ] Documentação NatSpec completa
- [ ] Scripts de deployment
- [ ] Auditoria de segurança