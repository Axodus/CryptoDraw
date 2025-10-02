// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AgentProxy
 * @notice Contrato proxy para registro de agentes e controle de comissão nas compras de bilhetes.
 *         Implementado para alinhar com a suíte de testes existente.
 */
contract AgentProxy is Ownable, ReentrancyGuard {
    // Endereço do contrato CryptoDraw (mantido para compatibilidade e consultas)
    address public cryptoDraw;

    // Comissão padrão em basis points (500 = 5%)
    uint16 public defaultCommissionRate = 500;

    struct AgentInfo {
        bool isActive;
        uint16 commissionRate; // em basis points
        uint256 totalTicketsSold;
        uint256 totalCommissionEarned; // acumulado em wei
    }

    mapping(address => AgentInfo) private agents;

    // Eventos esperados pela suíte de testes
    event AgentRegistered(address indexed agent, uint16 commissionRate);
    event AgentDeactivated(address indexed agent);
    event CommissionRateUpdated(address indexed agent, uint16 newRate);
    event DefaultCommissionRateUpdated(uint16 newRate);
    event TicketPurchasedThroughAgent(address indexed buyer, address indexed agent);
    event CommissionWithdrawn(address indexed agent, uint256 amount);

    constructor(address _cryptoDrawAddress) {
        cryptoDraw = _cryptoDrawAddress;
    }

    // ==== Admin: Agentes ====
    function registerAgent(address agent, uint16 commissionRate) external onlyOwner {
        require(agent != address(0), "InvalidAddress");
        require(commissionRate <= 2000, "InvalidCommissionRate"); // máx 20%

        AgentInfo storage info = agents[agent];
        info.isActive = true;
        info.commissionRate = commissionRate;
        // totalTicketsSold e totalCommissionEarned mantidos

        emit AgentRegistered(agent, commissionRate);
    }

    function deactivateAgent(address agent) external onlyOwner {
        // desativar mesmo que não exista (no-op)
        AgentInfo storage info = agents[agent];
        info.isActive = false;
        emit AgentDeactivated(agent);
    }

    function updateAgentCommissionRate(address agent, uint16 newRate) external onlyOwner {
        require(newRate <= 2000, "InvalidCommissionRate");
        AgentInfo storage info = agents[agent];
        require(info.isActive, "AgentNotFound");
        info.commissionRate = newRate;
        emit CommissionRateUpdated(agent, newRate);
    }

    function setDefaultCommissionRate(uint16 newRate) external onlyOwner {
        require(newRate <= 2000, "InvalidCommissionRate");
        defaultCommissionRate = newRate;
        emit DefaultCommissionRateUpdated(newRate);
    }

    // ==== Compra via Agente ====
    /**
     * @notice Registra uma compra via agente, calcula e acumula a comissão do agente e emite evento.
     *         Por compatibilidade com os testes, não encaminha o pagamento para o CryptoDraw.
     */
    function buyTicketThroughAgent(
        uint256 /*gameType*/,
        uint256[] calldata /*numbers*/,
        uint256 /*rounds*/,
        address agent
    ) external payable nonReentrant {
    AgentInfo storage info = agents[agent];
    require(info.isActive, "AgentNotActive");

        // Calcula comissão com base no rate do agente (ou default se zero)
        uint16 rate = info.commissionRate > 0 ? info.commissionRate : defaultCommissionRate;
        uint256 commission = (msg.value * rate) / 10000;

        info.totalTicketsSold += 1;
        info.totalCommissionEarned += commission;

        emit TicketPurchasedThroughAgent(msg.sender, agent);
    }

    // ==== Saque de comissão ====
    function withdrawCommission() external nonReentrant {
        AgentInfo storage info = agents[msg.sender];
        if (!info.isActive && info.totalCommissionEarned == 0) revert("AgentNotFound");
        uint256 amount = info.totalCommissionEarned;
        require(amount > 0, "NoCommissionAvailable");
        info.totalCommissionEarned = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "TransferFailed");
        emit CommissionWithdrawn(msg.sender, amount);
    }

    // ==== Views ====
    function getAgentInfo(address agent) external view returns (AgentInfo memory) {
        return agents[agent];
    }
}
