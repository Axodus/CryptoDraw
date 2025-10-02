// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/KeeperCompatibleInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface ITicketNFT {
    function burn(uint256 tokenId) external;
}

contract CryptoDraw is VRFConsumerBaseV2, Ownable, KeeperCompatibleInterface, ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    IERC20 public nativeTokenAddress;
    ITicketNFT public ticketNFT;
    AggregatorV3Interface public priceFeed;
    uint256 public ticketPriceUSD = 1 * 10 ** 18;
    uint8 public totalNumbers = 25;
    uint8 public minNumbers = 15;
    uint8 public maxNumbers = 20;
    uint256 public drawInterval = 4 days;
    uint256 public lastDrawTime;
    uint256 public prizePool;
    uint256 public currentDrawRound;
    bool public paused = false;

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 public subscriptionId;
    bytes32 public keyHash;
    uint16 requestConfirmations = 3;
    uint32 callbackGasLimit = 50000;
    uint32 numWords = 15;
    uint256[] public randomWords;
    uint256 public requestId;

    // Funds for various uses
    address public projectFund;
    address public grantFund;
    address public operationFund;

    struct Ticket {
        address player;
        uint8[] chosenNumbers;
        address agent;
        uint256 drawRound;
        uint256 ticketId;
    }

    Ticket[] public tickets;
    uint8[] public winningNumbers;
    mapping(address => uint256) public winnings;
    mapping(address => uint256) public agentCommissions;
    mapping(address => bool) public agents;
    mapping(address => bool) public agentSuspended;

    event TicketPurchased(address indexed player, uint8[] chosenNumbers, address agent);
    event DrawResult(uint8[] winningNumbers);
    event PrizeClaimed(address indexed player, uint256 amount);
    event AgentCommissionPaid(address indexed agent, uint256 amount);
    event RandomWordsRequested(uint256 requestId);
    event Paused();
    event Unpaused();

    constructor(
        address _nativeTokenAddress,
        address _ticketNFTAddress,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        address _priceFeedAddress,
        address _initialProjectFund,
        address _initialGrantFund,
        address _initialOperationFund
    ) 
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        nativeTokenAddress = IERC20(_nativeTokenAddress);
        ticketNFT = ITicketNFT(_ticketNFTAddress);
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        lastDrawTime = block.timestamp;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        projectFund = _initialProjectFund;
        grantFund = _initialGrantFund;
        operationFund = _initialOperationFund;
        currentDrawRound = 1;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(UPDATER_ROLE, msg.sender);
    }

    modifier onlyCustomRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: caller does not have the appropriate role");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyAgent() {
        require(agents[msg.sender] && !agentSuspended[msg.sender], "Not an active agent");
        _;
    }

    function purchaseTicket(uint8[] calldata _chosenNumbers, address _agent) external nonReentrant whenNotPaused {
        require(_chosenNumbers.length >= minNumbers && _chosenNumbers.length <= maxNumbers, "Invalid number of chosen numbers.");
        require(block.timestamp < lastDrawTime + drawInterval - 2 hours, "Purchases paused.");

        uint256 ticketPriceInNativeToken = getTicketPriceInNativeToken();
        uint256 ticketCost = ticketPriceInNativeToken * (_chosenNumbers.length - minNumbers + 1);
        safeTransferFrom(nativeTokenAddress, msg.sender, address(this), ticketCost);

        uint256 commission = ticketCost * 861 / 10000;
        uint256 amountForPrizePool = ticketCost * 4335 / 10000;
        uint256 amountForProjectFund = ticketCost * 2000 / 10000;
        uint256 amountForGrantFund = ticketCost * 1000 / 10000;
        uint256 amountForOperationFund = ticketCost * 1804 / 10000;

        // Transfer funds to respective wallets
        safeTransfer(nativeTokenAddress, projectFund, amountForProjectFund);
        safeTransfer(nativeTokenAddress, grantFund, amountForGrantFund);
        safeTransfer(nativeTokenAddress, operationFund, amountForOperationFund);

        // Update prize pool
        prizePool += amountForPrizePool;

        // Distribute agent commission
        if (_agent != address(0) && !agentSuspended[_agent]) {
            agentCommissions[_agent] += commission;
        }

        uint256 ticketId = tickets.length; // Use the length of the tickets array as a unique ticket ID

        tickets.push(Ticket(msg.sender, _chosenNumbers, _agent, currentDrawRound, ticketId));

        emit TicketPurchased(msg.sender, _chosenNumbers, _agent);
    }

    function getTicketPriceInNativeToken() public view returns (uint256) {
        (, int256 price, , ,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed data");
        uint256 priceInNativeToken = (ticketPriceUSD * 10 ** priceFeed.decimals()) / uint256(price);
        return priceInNativeToken;
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        bool drawTimeReached = (block.timestamp >= getNextDrawTime() && block.timestamp < getNextDrawTime() + 1 hours);
        upkeepNeeded = !paused && drawTimeReached && prizePool > 0;
        performData = "";
    }

    function performUpkeep(bytes calldata) external override whenNotPaused {
        require(block.timestamp >= getNextDrawTime(), "Draw time not reached.");
        require(prizePool > 0, "No prize pool available.");

        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        emit RandomWordsRequested(requestId);
    }

    function fulfillRandomWords(uint256, uint256[] memory _randomWords) internal override {
        randomWords = _randomWords;
        delete winningNumbers;

        for (uint8 i = 0; i < minNumbers; i++) {
            uint8 winningNumber = uint8(_randomWords[i] % totalNumbers) + 1;
            winningNumbers.push(winningNumber);
        }

        lastDrawTime = block.timestamp;
        currentDrawRound++;
        distributePrizes();

        emit DrawResult(winningNumbers);
    }

    function distributePrizes() internal {
        uint256 grossPrize = prizePool;

        // Distribute commissions to agents
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].agent != address(0) && !agentSuspended[tickets[i].agent]) {
                uint256 commission = agentCommissions[tickets[i].agent];
                if (commission > 0) {
                    agentCommissions[tickets[i].agent] = 0;
                    safeTransfer(nativeTokenAddress, tickets[i].agent, commission);
                    emit AgentCommissionPaid(tickets[i].agent, commission);
                }
            }
        }

        // Calculate prize distribution
        uint256 jackpotPrize = grossPrize * 50 / 100; // 50% of grossPrize
        uint256 prize14 = grossPrize * 20 / 100;     // 20% of grossPrize
        uint256 prize13 = grossPrize * 15 / 100;     // 15% of grossPrize
        uint256 prize12 = grossPrize * 10 / 100;     // 10% of grossPrize
        uint256 prize11 = grossPrize * 5 / 100;      // 5% of grossPrize

        uint256[] memory prizes = new uint256[](5);
        prizes[0] = jackpotPrize;
        prizes[1] = prize14;
        prizes[2] = prize13;
        prizes[3] = prize12;
        prizes[4] = prize11;

        // Check for winners and distribute prizes
        uint256 totalWinners = 0;
        uint256 jackpotCount = 0;

        for (uint256 i = 0; i < tickets.length; i++) {
            uint8 matchCount = getMatchCount(tickets[i].chosenNumbers);
            if (matchCount >= minNumbers) {
                uint256 prizeAmount = 0;
                if (matchCount == 15) {
                    prizeAmount = prizes[0];
                    jackpotCount++;
                } else if (matchCount == 14) {
                    prizeAmount = prizes[1];
                } else if (matchCount == 13) {
                    prizeAmount = prizes[2];
                } else if (matchCount == 12) {
                    prizeAmount = prizes[3];
                } else if (matchCount == 11) {
                    prizeAmount = prizes[4];
                }

                if (prizeAmount > 0) {
                    totalWinners++;
                    winnings[tickets[i].player] += prizeAmount;
                }
            }
        }

        // Accumulate jackpot if no jackpot winner
        if (jackpotCount == 0) {
            prizePool += jackpotPrize;
        } else {
            prizePool = 0;
        }
    }

    function getMatchCount(uint8[] memory _chosenNumbers) internal view returns (uint8) {
        uint8 matchCount = 0;
        bool[26] memory winningNumbersSet;

        for (uint8 i = 0; i < winningNumbers.length; i++) {
            winningNumbersSet[winningNumbers[i] - 1] = true;
        }

        for (uint8 i = 0; i < _chosenNumbers.length; i++) {
            if (winningNumbersSet[_chosenNumbers[i] - 1]) {
                matchCount++;
            }
        }

        return matchCount;
    }

    function claimPrize() external nonReentrant whenNotPaused {
        uint256 amount = winnings[msg.sender];
        require(amount > 0, "No winnings to claim.");

        winnings[msg.sender] = 0;

        // Burn the NFTs of winning tickets for the caller
        for (uint256 i = 0; i < tickets.length; i++) {
            if (tickets[i].player == msg.sender && tickets[i].drawRound == currentDrawRound - 1) {
                ticketNFT.burn(tickets[i].ticketId);
            }
        }

        safeTransfer(nativeTokenAddress, msg.sender, amount);
        emit PrizeClaimed(msg.sender, amount);
    }

    function pause() external onlyCustomRole(ADMIN_ROLE) {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyCustomRole(ADMIN_ROLE) {
        paused = false;
        emit Unpaused();
    }

    function getNextDrawTime() public view returns (uint256) {
        return lastDrawTime + drawInterval;
    }

    function safeTransfer(IERC20 _token, address _to, uint256 _amount) internal {
        bool sent = _token.transfer(_to, _amount);
        require(sent, "Token transfer failed.");
    }

    function safeTransferFrom(IERC20 _token, address _from, address _to, uint256 _amount) internal {
        bool sent = _token.transferFrom(_from, _to, _amount);
        require(sent, "Token transfer failed.");
    }

    function setTicketNFT(address _ticketNFTAddress) external onlyCustomRole(ADMIN_ROLE) {
        ticketNFT = ITicketNFT(_ticketNFTAddress);
    }

    function addAgent(address _agent) external onlyCustomRole(ADMIN_ROLE) {
        require(_agent != address(0), "Invalid agent address");
        agents[_agent] = true;
    }

    function removeAgent(address _agent) external onlyCustomRole(ADMIN_ROLE) {
        require(agents[_agent], "Agent does not exist");
        agents[_agent] = false;
    }

    function setDrawInterval(uint256 _drawInterval) external onlyCustomRole(ADMIN_ROLE) {
        require(_drawInterval > 0, "Invalid interval");
        drawInterval = _drawInterval;
    }
}
