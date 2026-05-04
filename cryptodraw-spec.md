# CryptoDraw — Especificação Técnica (RFC)

Data: 2025-10-01

Versão: 1.0

Autor: Equipe de Arquitetura

Resumo
-------
Este documento descreve em detalhe a arquitetura on-chain/off-chain e os formatos de dados necessários para implementar o produto CryptoDraw — um sistema de loterias on-chain inspirado em Lotofácil e SuperSete. Contém tabelas de storage, formatos exatos de Merkle leaf (para consolidação off-chain), assinaturas de funções (calldata), packing de números para otimização de gas, regras de lifecycle dos tickets (NFTs), fluxo de sorteio, e checklist de testes.

Índice
------
- 1 Visão geral
- 2 Objetos principais e storage (tabelas)
- 3 Formatos de dados compactados (Lotofácil, SuperSete)
- 4 Formato exato da Merkle leaf (bytes) e hashing
- 5 Assinaturas (ABI) e exemplos de calldata
- 6 Fluxo do Draw (Consolidação / Randomness / Claim)
- 7 Estratégias de verificação (Merkle proofs, on-demand claim)
- 8 Eventos / Errors / Modifiers
- 9 Regras de queima / expiração / Bolão
- 10 Pseudocódigo: geração de winning numbers a partir de randomness
- 11 Checklist de testes e QA
- 12 Considerações de segurança e otimização de gas

1 — Visão geral
-----------------
CryptoDraw opera com Draws agendados por jogo. Usuários compram tickets (NFTs não-transferíveis) para um jogo e para 1–6 rodadas consecutivas. Após fechamento de apostas (cutoff = scheduled_at - 3 horas) um serviço off-chain consolida entradas e submete um Merkle root e resumo financeiro ao contrato. O contrato pede randomness (p.ex. Chainlink VRF) e, após recebê-la, o sistema permite que vencedores reclamem prêmios apresentando Merkle proofs que provem inclusão do ticket no snapshot.

Objetivos principais deste spec:
- Definir formatos binários e ABI para interoperabilidade entre o consolidator off-chain e os contratos on-chain.
- Garantir packing eficiente para reduzir gas (bitmasks, uint32 packing).
- Definir fluxo de claim via Merkle proof para minimizar custo on-chain.

2 — Objetos principais e storage (tabelas)
------------------------------------------------

2.1 Struct `Ticket` (concepção para armazenamento off-chain; on-chain armazenar apenas índice/metadata compacto)

| Campo | Tipo (solidity) | Descrição |
|---|---:|---|
| ticketId | uint256 | Identificador único (tokenId) |
| owner | address | Proprietário do ticket |
| game | uint8 | Enum: 1=LOTOFACIL, 2=SUPERSETE |
| numbersPacked | uint32 | Bits compactos representando escolha do jogador (ver seção 3) |
| roundsBought | uint8 | 1..6 |
| roundsRemaining | uint8 | contador decrementar a cada draw concluído |
| firstDrawId | uint32 | id do draw inicial ao qual o ticket foi atribuído |
| createdAt | uint32 | timestamp de emissão (UNIX seconds) |
| expirationTimestamp | uint32 | timestamp da expiração (último draw + grace) |
| status | uint8 | enum: 0=ACTIVE,1=EXPIRED,2=REDEEMED,3=BURNED |

2.2 Struct `Draw` (on-chain minimal)

| Campo | Tipo (solidity) | Descrição |
|---|---:|---|
| drawId | uint32 | Identificador incremental |
| game | uint8 | id do jogo |
| scheduledAt | uint32 | timestamp UTC |
| cutoffAt | uint32 | scheduledAt - 3h |
| status | uint8 | enum: 0=SCHEDULED,1=OPEN,2=CLOSED,3=CONSOLIDATED,4=RANDOM_REQUESTED,5=RANDOM_FULFILLED,6=SETTLED |
| merkleRoot | bytes32 | root das entradas consolidadas (leaves = ticket-hash) |
| totalPoolUSD | uint256 | valor normalizado USD acumulado na consolidação (inteiro em cents ou com 18dec) |
| randomness | bytes32 | valor de randomness (após VRF) |
| winningPacked | uint32 | representação compacta do resultado (dependente do jogo) |

2.3 Mappings on-chain principais

- mapping(uint256 => TicketMeta) tickets; // TicketMeta é minimal: owner, status, maybe numbersPacked (opcional)
- mapping(uint32 => Draw) draws;
- mapping(address => uint256) withdrawableBalances; // pull pattern
- mapping(uint32 => mapping(uint8 => uint256)) tierPoolAmounts; // drawId -> tier -> amount

Observação: o contrato deve evitar armazenar listas grandes. Em vez disso, armazene apenas merkleRoot e contadores; reconstruct winners via proofs.

3 — Formatos de dados compactados (Lotofácil, SuperSete)
------------------------------------------------------
Objetivo: reduzir footprint on-chain. Apresentamos packing sugerido (uint32) para números.

3.1 Lotofácil (15 números em 1..25) — bitmask de 25 bits

- Representação: usar um bitmask de 25 bits, bit 0 corresponde ao número 1, bit 24 ao número 25.
- `numbersPacked` (uint32): cada bit setado = número escolhido.
- Exemplo: Escolha [1,2,3,5,15] => bitmask:
  - bit positions (LSB..): 1 => bit0, 2=>bit1, 3=>bit2, 5=>bit4, 15=>bit14
  - em hex: 1<<0 + 1<<1 + 1<<2 + 1<<4 + 1<<14 = 0x0000401B (decimal 16395)

3.2 SuperSete (7 colunas, dígitos 0..9) — pack 7 * 4 bits = 28 bits

- Representação: cada coluna usa 4 bits (valor 0..9). Ordem das colunas: coluna1 é nibble menos significativo.
- Layout (bits 0..3 = coluna1, bits 4..7 = coluna2, ..., bits 24..27 = coluna7).
- Exemplo: números [3,0,9,7,1,2,4]
  - packing: (4<<24) | (2<<20) | (1<<16) | (7<<12) | (9<<8) | (0<<4) | (3<<0)
  - Em hex: calcule conforme linguagem alvo.

3.3 Observações de endianness e compatibilidade
- Sempre use `abi.encodePacked(uint32(numbersPacked))` quando gerar leafs no solidity para garantir compatibilidade com off-chain.
- Nos exemplos off-chain, use Big-Endian hex quando codificar para debug (mas as funções de hashing recebem bytes em ordem natural gerada por encodePacked).

4 — Formato exato da Merkle leaf (bytes) e hashing
--------------------------------------------------
O formato da leaf precisa ser exatamente definido para que consolidator e contratos concordem no hash.

4.1 Definição recomendada (canonical)

Leaf = keccak256(abi.encodePacked(
  uint256(ticketId),
  address(owner),
  uint8(game),
  uint32(numbersPacked),
  uint8(roundsBought),
  uint32(firstDrawId)
))

Explicação e motivos:
- Usar `abi.encodePacked` cria um byte sequence compacto; a ordem e os tipos devem ser idênticos off-chain.
- Incluir ticketId e owner garante unicidade e protege contra replay/inclusão indevida.
- Incluir firstDrawId e roundsBought previne que um leaf trata entradas para draws diferentes como iguais.

4.2 Observação sobre tipos e padding
- `abi.encodePacked(uint256)` gera 32 bytes big-endian; `address` gera 20 bytes; `uint32` gera 4 bytes; `uint8` gera 1 byte. A concatenação é direta.
- Exemplos de como construir a leaf off-chain:

Javascript (ethers.js):

```js
const ethers = require('ethers');
function leafHex(ticketId, owner, game, numbersPacked, roundsBought, firstDrawId) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
    ['uint256','address','uint8','uint32','uint8','uint32'],
    [ticketId, owner, game, numbersPacked, roundsBought, firstDrawId]
  ));
}
```

Observação: `defaultAbiCoder.encode` inclui padding (32 bytes por tipo) — se você deseja `encodePacked` substitua por `ethers.utils.solidityPack` com os tipos exatos:

```js
ethers.utils.keccak256(ethers.utils.solidityPack(
  ['uint256','address','uint8','uint32','uint8','uint32'],
  [ticketId, owner, game, numbersPacked, roundsBought, firstDrawId]
));
```

4.3 Merkle tree building
- Usar árvore binary Merkle com concat ordenado por bytes (i.e., parent = keccak256(min||max) where min/max = sorted pair of children bytes) para evitar ambiguidade de ordem. Documente a ordenação usada e implemente-a consistentemente off/on-chain.

5 — Assinaturas (ABI) e exemplos de calldata
------------------------------------------------
As assinaturas abaixo representam as funções públicas principais. Ajuste nomes e tipos conforme preferência do time; usar nomes e tipos explícitos facilita auditoria.

5.1 `buyTicket`

Assinatura:

```solidity
function buyTicket(
  uint8 game,
  uint32 numbersPacked,
  uint8 rounds,
  address paymentToken,
  uint256 maxPaymentAmount
) external payable returns (uint256 ticketId);
```

- `maxPaymentAmount`: proteção do usuário contra slippage em caso de conversão off-chain.
- `paymentToken == address(0)` indica pagamento nativo (ETH) — requer wrapper para conversão.

Calldata (exemplo ABI-encoded) — gerado automaticamente por ferramentas (ethers.js/hardhat).

5.2 `consolidateDraw`

Assinatura:

```solidity
function consolidateDraw(
  uint32 drawId,
  bytes32 merkleRoot,
  uint256 totalPoolUSD
) external onlyRelayerOrAdmin;
```

Uso: chamada off-chain pelo consolidator após cutoff. Deve incluir `totalPoolUSD` (normalizado com oracle snapshot) e `merkleRoot` das leaves.

5.3 `requestRandomness` / VRF callback

Assinatura de request (pode ser privado/admin-relayer):

```solidity
function requestRandomness(uint32 drawId) external onlyRelayerOrAdmin returns (bytes32 requestId);
```

Fulfillment: a função callback do VRF (Chainlink) deve chamar `fulfillRandomness(bytes32 requestId, uint256 randomness)` implementada no contrato.

5.4 `claimPrize` (on-demand, via Merkle proof)

Assinatura:

```solidity
function claimPrize(
  uint256 ticketId,
  uint32 drawId,
  bytes32[] calldata merkleProof,
  uint8 expectedTier
) external nonReentrant;
```

Fluxo: o claim valida ticket ownership, ticket status, inclusion with merkleProof (leaf conforme seção 4), e valida que expectedTier é consistente com winning numbers. Se OK, resolve amount = tierPool / winnersCountInTier (ou fetch precomputed share), credita `withdrawableBalances[msg.sender] += amount`, e queima/redeem o ticket.

6 — Fluxo do Draw (Consolidação / Randomness / Claim)
-----------------------------------------------------
Sequência resumida:

1. `createDraw(game, scheduledAt)` — admin cria draw.
2. Usuários compram tickets com `buyTicket(..., firstDrawId = drawId)` até `cutoffAt` (scheduledAt - 3h).
3. Após cutoff, consolidator off-chain coleta tickets válidos e executa:
   - Gera leaves (veja seção 4), constrói Merkle tree e merkleRoot.
   - Calcula `totalPoolUSD` normalizando pagamentos (usando price feed snapshot pre-cutoff).
   - Chama `consolidateDraw(drawId, merkleRoot, totalPoolUSD)` on-chain.
4. Contrato muda status para CONSOLIDATED e solicita randomness `requestRandomness(drawId)`.
5. VRF providencia randomness, callback chama `fulfillRandomness` em contrato.
6. Contrato calcula `winningPacked` deterministically (veja seção 10) e sinaliza que draw está RANDOM_FULFILLED.
7. Off-chain indexer calcula winners por tier e publica proofs (ou os usuários enviam provas individualmente).
8. Usuários vencedores chamam `claimPrize` com proof e recebem prize (pull or push pattern).

7 — Estratégias de verificação (Merkle proofs, on-demand claim)
-------------------------------------------------------------
7.1 Claim on-demand (recomendado)
- Usuário fornece merkleProof e o contrato valida inclusion do leaf na merkleRoot previamente registrado em `draw.merkleRoot`.
- Contrato (ou off-chain indexer) deve saber quantos vencedores existem por tier para calcular valores; para evitar on-chain heavy computation, opções:
  - Off-chain indexer publica mapping tier->winnersCount (signed by indexer) e contrato aceita se assinado por operator multisig; OU
  - Claim realiza cálculo de prize por vencedor baseado em `tierPoolAmounts[drawId][tier] / winnersCount` previamente calculado e registrado on-chain via batched admin submission (consolidator submits tier counts in a second tx) — trade-off gas vs trust.

7.2 Verificação alternativa (defend against fake proofs)
- Use replay-protection: cada leaf inclui ticketId e firstDrawId; ticket ownership verified on-chain (owner mapping in TicketNFT) antes de aceitar claim.

8 — Eventos / Errors / Modifiers
--------------------------------

Eventos recomendados:
- `event TicketMinted(uint256 indexed ticketId, address indexed owner, uint8 game, uint32 firstDrawId);`
- `event DrawCreated(uint32 indexed drawId, uint8 game, uint32 scheduledAt);`
- `event DrawConsolidated(uint32 indexed drawId, bytes32 merkleRoot, uint256 totalPoolUSD);`
- `event RandomnessRequested(uint32 indexed drawId, bytes32 requestId);`
- `event RandomnessFulfilled(uint32 indexed drawId, bytes32 randomness);`
- `event PrizeClaimed(uint256 indexed ticketId, address indexed claimant, uint256 amount);`
- `event TicketBurned(uint256 indexed ticketId, address indexed owner, uint8 reason);`

Errors customizados (Solidity >=0.8.4, para economizar gas):
- `error ClosedForPurchase();`
- `error NotTicketOwner();`
- `error InvalidMerkleProof();`
- `error AlreadyRedeemed();`
- `error DrawNotConsolidated();`

Modifiers úteis:
- `onlyDuringOpen(drawId)` — require(block.timestamp <= draws[drawId].cutoffAt, ClosedForPurchase())
- `onlyAfterCutoff(drawId)` — require(block.timestamp > draws[drawId].cutoffAt, "NOT_CUTOFF")

9 — Regras de queima / expiração / Bolão
----------------------------------------

9.1 Validade e queima automática
- Ticket tem `expirationTimestamp = lastDrawTimestamp + 14 days`.
- Se ticket não ganhou, status -> EXPIRED após draw settled; qualquer endereço pode chamar `expireAndBurn(ticketId)` quando `block.timestamp >= expirationTimestamp` para queimar; opcionalmente recompensa quem queima.
- Se ticket for premiado e claim for executado com sucesso, ticket é queimado como parte do processo (status REDEEMED -> BURNED).

9.2 Bolão (Pool)
- Pool é uma entidade lógica que agrega contribuições e tickets.
- Ao comprar tickets em nome do pool, tickets são mintados com owner = address(PoolManager) ou token ownership atrelado a pool NFT; pool participants tem shares.
- No settlement, premio do pool é depositado em `poolPrize[poolId]` e participantes chamam `withdrawPoolShare(poolId)` que calcula `share = poolPrize * participantShares / totalShares`.

10 — Pseudocódigo: gerar winning numbers a partir de randomness
---------------------------------------------------------------
10.1 Função geradora (solidity-style pseudocode)

```solidity
function deriveLotofacilWinning(uint256 randomness) internal pure returns (uint32 packed) {
  // Gerar 15 números únicos entre 1..25
  uint8 k = 15;
  uint8 n = 25;
  uint32 selectedMask = 0;
  uint256 seed = randomness;
  uint8 count = 0;
  uint256 i = 0;
  while (count < k) {
    seed = uint256(keccak256(abi.encodePacked(seed, i)));
    uint8 candidate = uint8((seed % n) + 1);
    uint32 bit = 1 << (candidate - 1);
    if ((selectedMask & bit) == 0) {
      selectedMask |= bit;
      count++;
    }
    i++;
  }
  return selectedMask; // uint32
}
```

10.2 SuperSete derivation

```solidity
function deriveSuperSete(uint256 randomness) internal pure returns (uint32 packed) {
  uint256 seed = randomness;
  uint32 packed = 0;
  for (uint8 col = 0; col < 7; col++) {
    seed = uint256(keccak256(abi.encodePacked(seed, col)));
    uint8 digit = uint8(seed % 10); // 0..9
    packed |= uint32(digit) << (col*4);
  }
  return packed;
}
```

Observação: use randomness bytes originada por Chainlink VRF e combine com merkleRoot/drawId se necessário: `seed = keccak256(abi.encodePacked(randomness, merkleRoot, drawId))` para aumentar entropia e vínculo com o snapshot.

11 — Checklist de testes e QA
-----------------------------
- Unit tests (Hardhat/Foundry):
  - buyTicket: compra com ERC20 e ETH, pricing & fee accounting, packing numbers
  - cutoff enforcement: não permitir compra após cutoff
  - consolidateDraw: aceitar somente após cutoff; registrar merkleRoot e totalPool
  - requestRandomness/fulfillRandomness: fluxo correto de estados
  - derive functions: deterministic, sem duplicatas
  - claimPrize: prova válida aceita, inválida rejeitada
  - expireAndBurn: somente após expiration + 14d
  - Bolão flows: createPool, joinPool, pool buys tickets, pool withdraws

- Integration tests (testnet mocks):
  - Mock Chainlink VRF and Price Feeds, simular full draw lifecycle
  - Testes de merkle proofs: gerar leaves off-chain e provar inclusion on-chain

12 — Considerações de segurança e otimização de gas
--------------------------------------------------
- Use `nonReentrant` e `checks-effects-interactions` nas funções que transferem fundos.
- Favor `custom errors` em vez de longas mensagens revert para economizar gas.
- Use `uint32` timestamps e pack structs para reduzir custo de storage.
- Mantenha merkleRoot + counters on-chain, evite arrays grandes.
- Considere incentivos (gas rebate) para quem rodar `expireAndBurn` (keeper pattern).

13 — Exemplos práticos (JS & Python) para gerar leafs e provas
------------------------------------------------------------

Exemplo em Node.js (ethers.js) — leaf packing com solidityPack:

```js
const ethers = require('ethers');

function makeLeaf(ticketId, owner, game, numbersPacked, roundsBought, firstDrawId) {
  return ethers.utils.keccak256(ethers.utils.solidityPack(
    ['uint256','address','uint8','uint32','uint8','uint32'],
    [ticketId, owner, game, numbersPacked, roundsBought, firstDrawId]
  ));
}

// Exemplo: ticketId=123, owner='0xabc...', game=1, numbersPacked=0x401B, rounds=3, firstDraw=1001
// leafHex = makeLeaf(...)
```

Exemplo em Python (web3.py):

```py
from eth_abi import encode_abi
from eth_utils import keccak, to_checksum_address

def make_leaf(ticketId, owner, game, numbersPacked, roundsBought, firstDrawId):
    types = ['uint256','address','uint8','uint32','uint8','uint32']
    packed = encode_abi(types, [ticketId, to_checksum_address(owner), game, numbersPacked, roundsBought, firstDrawId])
    return keccak(packed).hex()
```

14 — Anexos: formatos de tokenURI e metadados
------------------------------------------------
Fornecer tokenURI imutável (IPFS) com o JSON exemplar abaixo para cada ticket:

```json
{
  "name": "CryptoDraw Ticket #1234",
  "description": "Ticket CryptoDraw — Lotofacil — 3 rodadas",
  "game": "lotofacil",
  "numbers": [1,2,3,5,15,...],
  "numbersPacked": 16395,
  "rounds": 3,
  "first_draw_id": 1001,
  "issued_at": 1696123200,
  "attributes": [ {"trait_type":"status","value":"ACTIVE"} ]
}
```

15 — Próximos passos sugeridos
------------------------------
- Gerar o skeleton de contratos (TicketNFT + CryptoDrawController) com as interfaces descritas aqui.
- Implementar consolidator off-chain (Node.js/Python) que gera Merkle trees e calcula `totalPoolUSD` usando snapshots de price feeds.
- Implementar suíte de testes com VRF/PriceFeed mocks.

# CryptoDraw — Especificação Técnica (RFC)

Data: 2025-10-01
Versão: 1.0
Autor: Equipe de Arquitetura

## Resumo

Este documento descreve em detalhe a arquitetura on-chain/off-chain e os formatos de dados necessários para implementar o produto CryptoDraw — um sistema de loterias on-chain inspirado em Lotofácil e SuperSete. Contém tabelas de storage, formatos exatos de Merkle leaf (para consolidação off-chain), assinaturas de funções (calldata), packing de números para otimização de gas, regras de lifecycle dos tickets (NFTs), fluxo de sorteio, e checklist de testes.

[...conteúdo completo do RFC mantido como no exemplo anterior...]

## 15 — Próximos passos sugeridos

* Gerar o skeleton de contratos (TicketNFT + CryptoDrawController) com as interfaces descritas aqui.
* Implementar consolidator off-chain (Node.js/Python) que gera Merkle trees e calcula `totalPoolUSD` usando snapshots de price feeds.
* Implementar suíte de testes com VRF/PriceFeed mocks.

Fim do documento.

