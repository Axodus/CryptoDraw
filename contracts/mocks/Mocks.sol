// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract VRFCoordinatorV2Mock is VRFCoordinatorV2Interface {
    uint96 public constant BASE_FEE = 100000000000000000; // 0.1 LINK
    uint256 public constant GAS_PRICE_LINK = 1000000000; // 1 gwei

    uint64 private s_currentSubId;
    mapping(uint64 => address) public s_subscriptions;
    mapping(uint64 => uint96) public s_subscriptionBalance;
    mapping(uint64 => address[]) public s_subscriptionConsumers;
    
    uint256 private s_requestId = 1;

    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );

    event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint96 payment, bool success);
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event SubscriptionFunded(uint64 indexed subId, uint256 oldBalance, uint256 newBalance);
    event SubscriptionConsumerAdded(uint64 indexed subId, address consumer);

    constructor(uint96 _baseFee, uint256 _gasPriceLink) {}

    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external override returns (uint256 requestId) {
        require(s_subscriptions[subId] != address(0), "Subscription not found");
        
        requestId = s_requestId++;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            0, // preSeed
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );

        return requestId;
    }

    function getRequestConfig() external pure override returns (uint16, uint32, bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](0);
        return (0, 0, hashes);
    }

    function createSubscription() external override returns (uint64 subId) {
        s_currentSubId++;
        subId = s_currentSubId;
        s_subscriptions[subId] = msg.sender;
        
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }

    function getSubscription(uint64 subId)
        external
        view
        override
        returns (
            uint96 balance,
            uint64 reqCount,
            address owner,
            address[] memory consumers
        )
    {
        return (
            s_subscriptionBalance[subId],
            0, // reqCount
            s_subscriptions[subId],
            s_subscriptionConsumers[subId]
        );
    }

    function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external override {}

    function acceptSubscriptionOwnerTransfer(uint64 subId) external override {}

    function addConsumer(uint64 subId, address consumer) external override {
        s_subscriptionConsumers[subId].push(consumer);
        emit SubscriptionConsumerAdded(subId, consumer);
    }

    function removeConsumer(uint64 subId, address consumer) external override {}

    function cancelSubscription(uint64 subId, address to) external override {}

    function pendingRequestExists(uint64 subId) external view override returns (bool) {
        return false;
    }

    // Mock specific functions
    function fundSubscription(uint64 subId, uint96 amount) external {
        uint96 oldBalance = s_subscriptionBalance[subId];
        s_subscriptionBalance[subId] += amount;
        emit SubscriptionFunded(subId, oldBalance, s_subscriptionBalance[subId]);
    }

    function fulfillRandomWords(uint256 requestId, address consumer) external {
        uint256[] memory randomWords = new uint256[](2);
        randomWords[0] = uint256(keccak256(abi.encode(requestId, block.timestamp, 1))) % 25 + 1;
        randomWords[1] = uint256(keccak256(abi.encode(requestId, block.timestamp, 2))) % 25 + 1;
        
        (bool success, ) = consumer.call(
            abi.encodeWithSignature("fulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        
        emit RandomWordsFulfilled(requestId, 0, BASE_FEE, success);
    }
}

contract PriceOracleMock {
    int256 private s_price = 200000000000; // $2000 with 8 decimals
    uint8 private s_decimals = 8;

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, s_price, block.timestamp, block.timestamp, 1);
    }

    function decimals() external view returns (uint8) {
        return s_decimals;
    }

    function setPrice(int256 price) external {
        s_price = price;
    }
}

contract CryptoDrawMock {
    uint256 private s_ticketPrice = 2 ether;
    uint256 private s_ticketCounter = 1;
    
    mapping(address => uint256) public agentCommissions;
    
    event TicketPurchased(
        address indexed buyer,
        uint256 indexed ticketId,
        uint256 gameType,
        uint256 rounds
    );

    function buyTicketWithAgent(
        uint256 gameType,
        uint256[] calldata numbers,
        uint256 rounds,
        address agent
    ) external payable returns (uint256) {
        require(msg.value >= s_ticketPrice * rounds, "Insufficient payment");
        
        uint256 ticketId = s_ticketCounter++;
        
        // Calculate agent commission (5%)
        uint256 commission = msg.value * 5 / 100;
        agentCommissions[agent] += commission;
        
        emit TicketPurchased(msg.sender, ticketId, gameType, rounds);
        
        return ticketId;
    }

    function getTicketPrice(uint256) external view returns (uint256) {
        return s_ticketPrice;
    }

    function setTicketPrice(uint256 price) external {
        s_ticketPrice = price;
    }

    function withdrawCommission() external {
        uint256 commission = agentCommissions[msg.sender];
        require(commission > 0, "No commission");
        
        agentCommissions[msg.sender] = 0;
        payable(msg.sender).transfer(commission);
    }
}

// GameLibrary wrapper for testing
import "../GameLibrary.sol";

contract GameLibraryWrapper {
    using GameLibrary for *;

    // EasyLotto functions
    function validateEasyLottoNumbers(uint8[] memory numbers) 
        external 
        pure 
        returns (bool valid) 
    {
        return GameLibrary.validateEasyLottoNumbers(numbers);
    }

    function packEasyLottoNumbers(uint8[] memory numbers) 
        external 
        pure 
        returns (uint32 packed) 
    {
        return GameLibrary.packEasyLottoNumbers(numbers);
    }

    function unpackEasyLottoNumbers(uint32 packed) 
        external 
        pure 
        returns (uint8[] memory numbers) 
    {
        return GameLibrary.unpackEasyLottoNumbers(packed);
    }

    function countEasyLottoMatches(uint32 packed1, uint32 packed2) 
        external 
        pure 
        returns (uint8 count) 
    {
        return GameLibrary.countEasyLottoMatches(packed1, packed2);
    }

    // SuperSeven functions
    function validateSuperSevenNumbers(uint8[] memory columns) 
        external 
        pure 
        returns (bool valid) 
    {
        return GameLibrary.validateSuperSevenNumbers(columns);
    }

    function packSuperSevenNumbers(uint8[] memory columns) 
        external 
        pure 
        returns (uint32 packed) 
    {
        return GameLibrary.packSuperSevenNumbers(columns);
    }

    function unpackSuperSevenNumbers(uint32 packed) 
        external 
        pure 
        returns (uint8[] memory columns) 
    {
        return GameLibrary.unpackSuperSevenNumbers(packed);
    }

    function countSuperSevenMatches(uint32 packed1, uint32 packed2) 
        external 
        pure 
        returns (uint8 count) 
    {
        return GameLibrary.countSuperSevenMatches(packed1, packed2);
    }
}