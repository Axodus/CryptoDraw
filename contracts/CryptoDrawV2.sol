// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./GameLibrary.sol";
import "./PriceOracle.sol";

interface ITicketNFTv2 {
    enum GameType { SUPERSETE, EASYLOTTO }
    enum TicketStatus { ACTIVE, EXPIRED, REDEEMED, BURNED }
    
    function mint(
        address to,
        GameType game,
        uint32 numbersPacked,
        uint256 drawRound,
        uint8 rounds
    ) external returns (uint256);
    
    function burn(uint256 tokenId) external;
    function updateStatus(uint256 tokenId, TicketStatus newStatus) external;
    function getTicket(uint256 tokenId) external view returns (
        address player,
        GameType game,
        uint32 numbersPacked,
        uint256 drawRound,
        uint8 roundsBought,
        uint8 roundsRemaining,
        uint256 createdAt,
        TicketStatus status
    );
}

/**
 * @title CryptoDraw
 * @dev Contrato principal do sistema de loteria CryptoDraw
 * @notice Suporta dois jogos: SuperSete e EasyLotto (Lotofácil) na blockchain Harmony
 */
contract CryptoDraw is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using GameLibrary for uint8[];
    using GameLibrary for uint32;
    
    // ============ ROLES ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    // ============ ENUMS ============
    
    enum GameType { SUPERSETE, EASYLOTTO }
    
    enum DrawStatus {
        SCHEDULED,           // Sorteio agendado
        OPEN,               // Aberto para apostas
        CLOSED,             // Fechado, aguardando randomness
        RANDOM_REQUESTED,   // Randomness solicitado
        COMPLETED           // Sorteio completo
    }
    
    // ============ STRUCTS ============
    
    struct GameConfig {
        uint256 ticketPriceUSD;     // Preço em USD (18 decimais)
        uint256 drawInterval;       // Intervalo entre sorteios
        uint256 lastDrawTime;       // Último sorteio
        uint32 currentDrawId;       // ID do sorteio atual
        bool enabled;               // Jogo ativo
    }
    
    struct Draw {
        uint32 drawId;
        GameType game;
        uint256 scheduledAt;
        uint256 closedAt;
        DrawStatus status;
        uint32 winningNumbersPacked;
        uint256 totalPoolUSD;
        uint256 totalTickets;
    }
    
    struct RevenueConfig {
        uint16 prizesPercent;       // % para prêmios (base 10000)
        uint16 projectFundPercent;  // % para fundo do projeto
        uint16 grantFundPercent;    // % para fundo de grants
        uint16 operationPercent;    // % para operações
        uint16 agentCommissionPercent; // % comissão agentes
    }
    
    // ============ STATE VARIABLES ============
    
    // Contratos
    ITicketNFTv2 public ticketNFT;
    PriceOracle public priceOracle;
    
    // Carteiras de destino
    address public treasuryWallet;      // Recebe pagamentos dos tickets
    address public prizeWallet;         // Paga prêmios em wONE
    address public projectFund;
    address public grantFund;
    address public operationFund;
    
    // Configurações dos jogos
    mapping(GameType => GameConfig) public gameConfigs;
    
    // Configuração de receitas
    RevenueConfig public revenueConfig;
    
    // Sorteios
    mapping(GameType => mapping(uint32 => Draw)) public draws;
    
    // Tokens suportados para pagamento (deppegs)
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;
    
    // Agentes e comissões
    mapping(address => bool) public suspendedAgents;
    mapping(address => uint256) public agentCommissions;
    
    // Balanços retiráveis (pull pattern)
    mapping(address => uint256) public withdrawableBalances;
    
    // ============ EVENTS ============
    
    event TicketPurchased(
        uint256 indexed ticketId,
        address indexed player,
        GameType game,
        uint32 drawId,
        address paymentToken,
        uint256 paymentAmount,
        address indexed agent
    );
    
    event DrawCreated(GameType indexed game, uint32 indexed drawId, uint256 scheduledAt);
    event DrawClosed(GameType indexed game, uint32 indexed drawId);
    event DrawCompleted(GameType indexed game, uint32 indexed drawId, uint32 winningNumbers);
    event PrizeClaimed(address indexed player, uint256 amount);
    event AgentCommissionPaid(address indexed agent, uint256 amount);
    event RevenueDistributed(uint256 prizes, uint256 project, uint256 grant, uint256 operation);
    event EmergencyWithdrawal(address indexed token, address indexed to, uint256 amount);
    event TokenSupportUpdated(address indexed token, bool supported);
    event AgentStatusUpdated(address indexed agent, bool suspended);
    event GameConfigured(GameType indexed game, uint256 ticketPriceUSD, uint256 drawInterval, bool enabled);
    
    // ============ ERRORS ============
    
    error GameNotEnabled();
    error DrawNotOpen();
    error InvalidPaymentToken();
    error InsufficientPayment();
    error InvalidNumbers();
    error AgentSuspended();
    error NotTicketOwner();
    error TicketAlreadyRedeemed();
    error NoWithdrawableBalance();
    error InvalidRevenueConfig();
    error ZeroAddress();
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        address _ticketNFT,
        address _priceOracle,
        address _treasuryWallet,
        address _prizeWallet,
        address _projectFund,
        address _grantFund,
        address _operationFund
    ) {
        if (_ticketNFT == address(0) || _priceOracle == address(0) || 
            _treasuryWallet == address(0) || _prizeWallet == address(0)) {
            revert ZeroAddress();
        }
        
        ticketNFT = ITicketNFTv2(_ticketNFT);
        priceOracle = PriceOracle(_priceOracle);
        treasuryWallet = _treasuryWallet;
        prizeWallet = _prizeWallet;
        projectFund = _projectFund;
        grantFund = _grantFund;
        operationFund = _operationFund;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        
        // Configuração inicial de receitas (base 10000)
        // 43.35% prêmios, 8.61% agentes, resto distribuído
        revenueConfig = RevenueConfig({
            prizesPercent: 4335,         // 43.35%
            projectFundPercent: 2000,    // 20%
            grantFundPercent: 1500,      // 15%
            operationPercent: 1304,      // 13.04%
            agentCommissionPercent: 861  // 8.61%
        });
        
        // Configuração inicial dos jogos
        gameConfigs[GameType.SUPERSETE] = GameConfig({
            ticketPriceUSD: 1 * 10**18,  // $1.00
            drawInterval: 1 weeks,
            lastDrawTime: block.timestamp,
            currentDrawId: 0,
            enabled: true
        });
        
        gameConfigs[GameType.EASYLOTTO] = GameConfig({
            ticketPriceUSD: 1 * 10**18,  // $1.00
            drawInterval: 4 days,
            lastDrawTime: block.timestamp,
            currentDrawId: 0,
            enabled: true
        });
    }
    
    // ============ EXTERNAL FUNCTIONS - TICKET PURCHASE ============
    
    /**
     * @dev Compra um ticket de loteria
     * @param game Tipo de jogo
     * @param numbers Números escolhidos
     * @param rounds Quantidade de rodadas (1-6)
     * @param paymentToken Token para pagamento
     * @param maxPaymentAmount Proteção contra slippage
     * @param agent Endereço do agente (address(0) para sem agente)
     */
    function buyTicket(
        GameType game,
        uint8[] calldata numbers,
        uint8 rounds,
        address paymentToken,
        uint256 maxPaymentAmount,
        address agent
    ) public payable nonReentrant whenNotPaused returns (uint256 ticketId) {
        // Validações
        GameConfig storage config = gameConfigs[game];
        if (!config.enabled) revert GameNotEnabled();
        if (!supportedTokens[paymentToken]) revert InvalidPaymentToken();
        if (rounds < 1 || rounds > 6) revert("Invalid rounds");
        if (agent != address(0) && suspendedAgents[agent]) revert AgentSuspended();
        
        // Valida e empacota números
        uint32 numbersPacked;
        if (game == GameType.EASYLOTTO) {
            if (!GameLibrary.validateEasyLottoNumbers(numbers)) revert InvalidNumbers();
            numbersPacked = GameLibrary.packEasyLottoNumbers(numbers);
        } else {
            if (!GameLibrary.validateSuperSeteNumbers(numbers)) revert InvalidNumbers();
            numbersPacked = GameLibrary.packSuperSeteNumbers(numbers);
        }
        
        // Calcula pagamento
        uint256 totalPriceUSD = config.ticketPriceUSD * rounds;
        uint256 paymentAmount = priceOracle.convertFromUSD(paymentToken, totalPriceUSD);
        
        if (paymentAmount > maxPaymentAmount) revert InsufficientPayment();
        
        // Processa pagamento
        if (paymentToken == address(0)) {
            // Pagamento nativo (ONE)
            require(msg.value >= paymentAmount, "Insufficient native payment");
            (bool success, ) = treasuryWallet.call{value: paymentAmount}("");
            require(success, "Transfer failed");
            
            // Devolve excesso
            if (msg.value > paymentAmount) {
                (success, ) = msg.sender.call{value: msg.value - paymentAmount}("");
                require(success, "Refund failed");
            }
        } else {
            // Pagamento ERC20
            IERC20(paymentToken).safeTransferFrom(msg.sender, treasuryWallet, paymentAmount);
        }
        
        // Cria o sorteio se necessário
        uint32 drawId = _ensureDrawExists(game);
        
        // Minta NFT
        ticketId = ticketNFT.mint(
            msg.sender,
            ITicketNFTv2.GameType(uint8(game)),
            numbersPacked,
            drawId,
            rounds
        );
        
        // Atualiza stats do sorteio
        draws[game][drawId].totalTickets++;
        draws[game][drawId].totalPoolUSD += totalPriceUSD;
        
        // Registra comissão do agente
        if (agent != address(0) && hasRole(AGENT_ROLE, agent)) {
            uint256 commission = (totalPriceUSD * revenueConfig.agentCommissionPercent) / 10000;
            agentCommissions[agent] += commission;
        }
        
        emit TicketPurchased(ticketId, msg.sender, game, drawId, paymentToken, paymentAmount, agent);
        
        return ticketId;
    }
    
    // ============ EXTERNAL FUNCTIONS - DRAW MANAGEMENT ============
    
    /**
     * @dev Fecha um sorteio e gera números vencedores
     * @param game Tipo de jogo
     * @param drawId ID do sorteio
     * @param randomness Valor de randomness (do VRF ou similar)
     */
    function closeDraw(GameType game, uint32 drawId, uint256 randomness)
        public
        onlyRole(OPERATOR_ROLE)
    {
        Draw storage draw = draws[game][drawId];
        require(draw.status == DrawStatus.OPEN, "Draw not open");
        
        // Gera números vencedores
        if (game == GameType.EASYLOTTO) {
            draw.winningNumbersPacked = GameLibrary.generateEasyLottoWinning(randomness, drawId);
        } else {
            draw.winningNumbersPacked = GameLibrary.generateSuperSeteWinning(randomness, drawId);
        }
        
        draw.status = DrawStatus.COMPLETED;
        draw.closedAt = block.timestamp;
        
        // Distribui receitas
        _distributeRevenue(game, drawId);
        
        emit DrawCompleted(game, drawId, draw.winningNumbersPacked);
    }

    /**
     * @dev Compat: fecha um sorteio mudando para estado CLOSED e emite DrawClosed (sem gerar vencedores)
     *      Usado por testes legados que esperam dois estágios (CLOSED -> COMPLETED)
     */
    function closeDraw(GameType game, uint32 drawId)
        public
        onlyRole(OPERATOR_ROLE)
    {
        Draw storage draw = draws[game][drawId];
        require(draw.status == DrawStatus.OPEN, "Draw not open");
        draw.status = DrawStatus.CLOSED;
        draw.closedAt = block.timestamp;
        emit DrawClosed(game, drawId);
    }

    /**
     * @dev Compat: alias semântica usada nos testes atuais para fechamento simples
     */
    function closeDrawSimple(GameType game, uint32 drawId)
        public
        onlyRole(OPERATOR_ROLE)
    {
        Draw storage draw = draws[game][drawId];
        require(draw.status == DrawStatus.OPEN, "Draw not open");
        draw.status = DrawStatus.CLOSED;
        draw.closedAt = block.timestamp;
        emit DrawClosed(game, drawId);
    }
    
    // ============ EXTERNAL FUNCTIONS - PRIZE CLAIM ============
    
    /**
     * @dev Reclama prêmio de um ticket vencedor
     * @param ticketId ID do ticket
     */
    function claimPrize(uint256 ticketId) external nonReentrant {
        (
            address player,
            ITicketNFTv2.GameType gameType,
            uint32 numbersPacked,
            uint256 drawRound,
            ,,,
            ITicketNFTv2.TicketStatus status
        ) = ticketNFT.getTicket(ticketId);
        
        if (player != msg.sender) revert NotTicketOwner();
        if (status == ITicketNFTv2.TicketStatus.REDEEMED) revert TicketAlreadyRedeemed();
        
        GameType game = GameType(uint8(gameType));
        Draw storage draw = draws[game][uint32(drawRound)];
        
        require(draw.status == DrawStatus.COMPLETED, "Draw not completed");
        
        // Calcula acertos
        uint8 matches;
        if (game == GameType.EASYLOTTO) {
            matches = GameLibrary.countEasyLottoMatches(numbersPacked, draw.winningNumbersPacked);
        } else {
            matches = GameLibrary.countSuperSeteMatches(numbersPacked, draw.winningNumbersPacked);
        }
        
        // Calcula prêmio baseado nos acertos
        uint256 prizeAmount = _calculatePrize(game, matches, draw.totalPoolUSD);
        
        if (prizeAmount > 0) {
            withdrawableBalances[msg.sender] += prizeAmount;
            ticketNFT.updateStatus(ticketId, ITicketNFTv2.TicketStatus.REDEEMED);
            
            emit PrizeClaimed(msg.sender, prizeAmount);
        }
    }
    
    /**
     * @dev Saca prêmios acumulados
     */
    function withdrawPrize() public nonReentrant {
        uint256 amount = withdrawableBalances[msg.sender];
        if (amount == 0) revert NoWithdrawableBalance();
        
        withdrawableBalances[msg.sender] = 0;
        
        // Transfere wONE/ONE do prizeWallet
        // Nota: Assume que prizeWallet tem fundos suficientes
        // Em produção, pode usar um mecanismo de pull ou ter contrato intermediário
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Prize transfer failed");
    }
    
    /**
     * @dev Agentes podem sacar suas comissões
     */
    function withdrawAgentCommission() public nonReentrant {
        uint256 commission = agentCommissions[msg.sender];
        if (commission == 0) revert NoWithdrawableBalance();
        
        agentCommissions[msg.sender] = 0;
        
        // Paga em ONE nativo
        (bool success, ) = msg.sender.call{value: commission}("");
        require(success, "Commission transfer failed");
        
        emit AgentCommissionPaid(msg.sender, commission);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Configura um jogo
     */
    function setGameConfig(
        GameType game,
        uint256 ticketPriceUSD,
        uint256 drawInterval,
        bool enabled
    ) public onlyRole(ADMIN_ROLE) {
        GameConfig storage config = gameConfigs[game];
        config.ticketPriceUSD = ticketPriceUSD;
        config.drawInterval = drawInterval;
        config.enabled = enabled;
        emit GameConfigured(game, ticketPriceUSD, drawInterval, enabled);
    }
    
    /**
     * @dev Atualiza configuração de receitas
     */
    function setRevenueConfig(RevenueConfig memory _config) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        // Valida que soma = 100%
        uint16 total = _config.prizesPercent + _config.projectFundPercent + 
                       _config.grantFundPercent + _config.operationPercent + 
                       _config.agentCommissionPercent;
        
        if (total != 10000) revert InvalidRevenueConfig();
        
        revenueConfig = _config;
    }

    /**
     * @dev Compat: API antiga updateRevenueConfig com parâmetros planos
     */
    function updateRevenueConfig(
        uint16 prizesPercent,
        uint16 projectFundPercent,
        uint16 grantFundPercent,
        uint16 operationPercent,
        uint16 agentCommissionPercent
    ) external onlyRole(ADMIN_ROLE) {
        setRevenueConfig(RevenueConfig({
            prizesPercent: prizesPercent,
            projectFundPercent: projectFundPercent,
            grantFundPercent: grantFundPercent,
            operationPercent: operationPercent,
            agentCommissionPercent: agentCommissionPercent
        }));
    }
    
    /**
     * @dev Adiciona/remove token suportado
     */
    function setSupportedToken(address token, bool supported) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        if (supported && !supportedTokens[token]) {
            supportedTokens[token] = true;
            supportedTokensList.push(token);
        } else if (!supported && supportedTokens[token]) {
            supportedTokens[token] = false;
            // Remove da lista
            for (uint256 i = 0; i < supportedTokensList.length; i++) {
                if (supportedTokensList[i] == token) {
                    supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                    supportedTokensList.pop();
                    break;
                }
            }
        }
        
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @dev Compat: alias para API antiga usada nos testes
     */
    function updateTokenSupport(address token, bool supported) external onlyRole(ADMIN_ROLE) {
        setSupportedToken(token, supported);
    }
    
    /**
     * @dev Suspende/reativa agente
     */
    function setSuspendedAgent(address agent, bool suspended) 
        public 
        onlyRole(ADMIN_ROLE) 
    {
        suspendedAgents[agent] = suspended;
        emit AgentStatusUpdated(agent, suspended);
    }

    /**
     * @dev Compat: cria (ou garante) um sorteio aberto para o jogo
     */
    function createDraw(GameType game) public onlyRole(OPERATOR_ROLE) {
        _ensureDrawExists(game);
    }
    
    /**
     * @dev Atualiza carteiras de destino
     */
    function setWallets(
        address _treasuryWallet,
        address _prizeWallet,
        address _projectFund,
        address _grantFund,
        address _operationFund
    ) public onlyRole(ADMIN_ROLE) {
        if (_treasuryWallet != address(0)) treasuryWallet = _treasuryWallet;
        if (_prizeWallet != address(0)) prizeWallet = _prizeWallet;
        if (_projectFund != address(0)) projectFund = _projectFund;
        if (_grantFund != address(0)) grantFund = _grantFund;
        if (_operationFund != address(0)) operationFund = _operationFund;
    }
    
    /**
     * @dev Pausa o contrato (emergência)
     */
    function pause() public onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Despausa o contrato
     */
    function unpause() public onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Saque de emergência
     */
    function emergencyWithdraw(address token, address to, uint256 amount) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (to == address(0)) revert ZeroAddress();
        
        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        
        emit EmergencyWithdrawal(token, to, amount);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Garante que existe um sorteio aberto para o jogo
     */
    function _ensureDrawExists(GameType game) internal returns (uint32 drawId) {
        GameConfig storage config = gameConfigs[game];
        drawId = config.currentDrawId;
        
        Draw storage currentDraw = draws[game][drawId];
        
        // Se não existe ou está fechado, cria novo
        if (currentDraw.status == DrawStatus(0) || currentDraw.status >= DrawStatus.CLOSED) {
            drawId = ++config.currentDrawId;
            
            draws[game][drawId] = Draw({
                drawId: drawId,
                game: game,
                scheduledAt: block.timestamp + config.drawInterval,
                closedAt: 0,
                status: DrawStatus.OPEN,
                winningNumbersPacked: 0,
                totalPoolUSD: 0,
                totalTickets: 0
            });
            
            emit DrawCreated(game, drawId, block.timestamp + config.drawInterval);
        }
        
        return drawId;
    }
    
    /**
     * @dev Distribui receitas de um sorteio
     */
    function _distributeRevenue(GameType game, uint32 drawId) internal {
        Draw storage draw = draws[game][drawId];
        uint256 totalUSD = draw.totalPoolUSD;
        
        uint256 prizesAmount = (totalUSD * revenueConfig.prizesPercent) / 10000;
        uint256 projectAmount = (totalUSD * revenueConfig.projectFundPercent) / 10000;
        uint256 grantAmount = (totalUSD * revenueConfig.grantFundPercent) / 10000;
        uint256 operationAmount = (totalUSD * revenueConfig.operationPercent) / 10000;
        
        // Nota: Distribuição real de fundos seria feita off-chain ou em outro contrato
        // Aqui apenas emitimos evento para tracking
        
        emit RevenueDistributed(prizesAmount, projectAmount, grantAmount, operationAmount);
    }
    
    /**
     * @dev Calcula prêmio baseado em acertos
     */
    function _calculatePrize(GameType game, uint8 matches, uint256 totalPool) 
        internal 
        pure 
        returns (uint256) 
    {
        if (game == GameType.EASYLOTTO) {
            // EasyLotto: prêmios para 11-15 acertos
            if (matches == 15) return (totalPool * 5000) / 10000; // 50% do pool de prêmios
            if (matches == 14) return (totalPool * 2000) / 10000; // 20%
            if (matches == 13) return (totalPool * 1500) / 10000; // 15%
            if (matches == 12) return (totalPool * 1000) / 10000; // 10%
            if (matches == 11) return (totalPool * 500) / 10000;  // 5%
        } else {
            // SuperSete: prêmios por colunas acertadas
            if (matches == 7) return (totalPool * 5000) / 10000; // 50%
            if (matches == 6) return (totalPool * 2000) / 10000; // 20%
            if (matches == 5) return (totalPool * 1500) / 10000; // 15%
            if (matches == 4) return (totalPool * 1000) / 10000; // 10%
            if (matches == 3) return (totalPool * 500) / 10000;  // 5%
        }
        
        return 0;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    function getDraw(GameType game, uint32 drawId) external view returns (Draw memory) {
        return draws[game][drawId];
    }
    
    function getCurrentDrawId(GameType game) external view returns (uint32) {
        return gameConfigs[game].currentDrawId;
    }
    
    // Permite receber ONE nativo
    receive() external payable {}

    // ============ BACKWARD-COMPAT WRAPPERS (TESTS) ============

    /**
     * @dev Compat: API antiga configureGame(game,ticketPriceUSD,drawInterval,enabled)
     */
    function configureGame(uint8 game, uint256 ticketPriceUSD, uint256 drawInterval, bool enabled) external onlyRole(ADMIN_ROLE) {
        setGameConfig(GameType(game), ticketPriceUSD, drawInterval, enabled);
    }

    /**
     * @dev Compat: compra via ERC20 na assinatura antiga dos testes
     */
    function buyTicketWithToken(
        uint8 game,
        uint8[] calldata numbers,
        uint8 rounds,
        address paymentToken,
        uint256 maxPaymentAmount,
        address agent
    ) external returns (uint256) {
        return buyTicket(GameType(game), numbers, rounds, paymentToken, maxPaymentAmount, agent);
    }

    /**
     * @dev Compat: getter com nome "prizeOracle" esperado por alguns testes
     */
    function prizeOracle() external view returns (address) {
        return address(priceOracle);
    }
}
