### CryptoDraw Contract Technical Documentation

#### **Overview**

The `CryptoDraw` contract is a lottery system that integrates Chainlink VRF for random number generation and Chainlink Keepers for automated draw scheduling. It utilizes ERC20 tokens for ticket purchases and integrates with a custom NFT contract for ticket management. 

#### **Imports**

1. **IERC20**: Interface for ERC20 token interactions.
2. **VRFConsumerBaseV2**: Chainlink VRF base contract for random number requests.
3. **VRFCoordinatorV2Interface**: Interface for Chainlink VRF Coordinator.
4. **Ownable**: Provides basic access control mechanism.
5. **AccessControl**: Allows role-based access control.
6. **KeeperCompatibleInterface**: Interface for Chainlink Keepers.
7. **ReentrancyGuard**: Prevents reentrancy attacks.
8. **AggregatorV3Interface**: Chainlink interface for price feeds.
9. **TicketNFT**: Custom contract managing NFT tickets.

#### **Contract State Variables**

- **`nativeTokenAddress`**: The ERC20 token used for transactions.
- **`priceFeed`**: Chainlink price feed contract for USD/NativeToken conversion.
- **`ticketNFT`**: Instance of the `TicketNFT` contract.
- **`ticketPriceUSD`**: The price of a ticket in USD.
- **`totalNumbers`**: The total range of numbers for the lottery.
- **`minNumbers`**: Minimum number of numbers a player must choose.
- **`maxNumbers`**: Maximum number of numbers a player can choose.
- **`drawInterval`**: Interval between draws.
- **`lastDrawTime`**: Timestamp of the last draw.
- **`prizePool`**: Total pool of prize money.
- **`COORDINATOR`**: Chainlink VRF Coordinator interface.
- **`subscriptionId`**: Chainlink VRF subscription ID.
- **`keyHash`**: Key hash for Chainlink VRF.
- **`requestConfirmations`**: Number of confirmations for Chainlink VRF.
- **`callbackGasLimit`**: Gas limit for Chainlink VRF callback.
- **`numWords`**: Number of random words to request.
- **`randomWords`**: Array of random words from Chainlink VRF.
- **`requestId`**: ID of the Chainlink VRF request.
- **`projectFund`**: Fund allocation for the project.
- **`grantFund`**: Fund allocation for grants.
- **`operationFund`**: Fund allocation for operations.
- **`agents`**: Mapping of valid agents.
- **`isSuspended`**: Tracking of suspended agents.
- **`agentTicketCounts`**: Number of tickets sold by each agent.
- **`tickets`**: Array of purchased tickets.
- **`winningNumbers`**: Array of winning numbers.
- **`winnings`**: Mapping of player winnings.
- **`agentCommissions`**: Tracking of agent commissions.

#### **Events**

- **`TicketPurchased`**: Emitted when a ticket is purchased.
- **`DrawResult`**: Emitted when the draw results are determined.
- **`PrizeClaimed`**: Emitted when a player claims a prize.
- **`AgentCommissionPaid`**: Emitted when an agent receives commission.
- **`RandomWordsRequested`**: Emitted when random words are requested.
- **`AgentAdded`**: Emitted when an agent is added.
- **`AgentRemoved`**: Emitted when an agent is removed.
- **`AgentSuspended`**: Emitted when an agent is suspended.
- **`AgentUnsuspended`**: Emitted when an agent is unsuspended.
- **`DrawIntervalUpdated`**: Emitted when the draw interval is updated.

#### **Constructor**

Initializes the contract with necessary parameters:
- `_nativeTokenAddress`: Address of the ERC20 token.
- `_vrfCoordinator`: Address of the Chainlink VRF Coordinator.
- `_keyHash`: Key hash for Chainlink VRF.
- `_subscriptionId`: Chainlink VRF subscription ID.
- `_priceFeedAddress`: Address of the Chainlink price feed.
- `_ticketNFTAddress`: Address of the TicketNFT contract.
- `_initialProjectFund`: Initial project fund allocation.
- `_initialGrantFund`: Initial grant fund allocation.
- `_initialOperationFund`: Initial operation fund allocation.

#### **Modifiers**

- **`onlyRole(bytes32 role)`**: Ensures the caller has the required role.
- **`onlyAgent()`**: Ensures the caller is a registered agent.
- **`notSuspended()`**: Ensures the agent is not suspended.

#### **Functions**

- **`addAgent(address _agent)`**: Adds a new agent with the `ADMIN_ROLE`.
- **`removeAgent(address _agent)`**: Removes an existing agent with the `ADMIN_ROLE`.
- **`suspendAgent(address _agent)`**: Suspends an agent with the `ADMIN_ROLE`.
- **`unsuspendAgent(address _agent)`**: Unsuspends an agent with the `ADMIN_ROLE`.
- **`updateDrawInterval(uint256 _newDrawInterval)`**: Updates the interval between draws.
- **`purchaseTicket(uint8[] calldata _chosenNumbers, address _agent)`**: Allows players to purchase tickets.
- **`getTicketPriceInNativeToken()`**: Returns the ticket price in native tokens.
- **`checkUpkeep(bytes calldata)`**: Chainlink Keeper check for maintenance.
- **`performUpkeep(bytes calldata)`**: Chainlink Keeper performs the draw if conditions are met.
- **`fulfillRandomWords(uint256, uint256[] memory _randomWords)`**: Callback from Chainlink VRF with random numbers.
- **`distributePrizes()`**: Distributes the prize pool and agent commissions.
- **`getMatchCount(uint8[] memory _chosenNumbers)`**: Counts the number of matching numbers.
- **`claimPrize()`**: Allows players to claim their winnings.
- **`claimAgentCommission()`**: Allows agents to claim their commissions.
- **`updateTicketPriceUSD(uint256 _newPriceUSD)`**: Updates the price of a ticket in USD.
- **`withdrawFunds(uint256 _amount)`**: Withdraws funds from the contract.
- **`grantRole(bytes32 role, address account)`**: Grants a role to an account.
- **`revokeRole(bytes32 role, address account)`**: Revokes a role from an account.
- **`getAgentTicketCount(address _agent)`**: Returns the number of tickets sold by an agent.
- **`safeTransfer(IERC20 token, address to, uint256 amount)`**: Safely transfers tokens.
- **`safeTransferFrom(IERC20 token, address from, address to, uint256 amount)`**: Safely transfers tokens from another address.

#### **Internal Functions**

- **`safeTransfer`**: Ensures safe transfer of ERC20 tokens.
- **`safeTransferFrom`**: Ensures safe transfer of ERC20 tokens from another address.

The prize distribution mechanism in the `CryptoDraw` contract is designed to allocate the prize pool and agent commissions based on predefined percentages. Here's a detailed breakdown of how prizes are calculated:

### Prize Calculation Process

1. **Prize Pool Contribution**:
   - Each ticket purchased contributes to the `prizePool`. The total `prizePool` accumulates from all ticket sales until the next draw occurs.

2. **Draw Execution**:
   - When a draw is executed (either manually or by Chainlink Keepers), random numbers are generated by Chainlink VRF, and the winning numbers are determined.

3. **Prize Distribution**:
   - **Gross Prize Distribution**:
     - **Gross Prize Pool**: This is a portion of the `prizePool` that is set aside for prize money.
     - **Percentage**: 43.35% of the `prizePool` is allocated to the gross prize pool.
     - **Calculation**: `grossPrize = (prizePool * 4335) / 10000`

   - **Agent Commissions Distribution**:
     - **Agent Commissions Pool**: This is a portion of the `prizePool` allocated to agent commissions.
     - **Percentage**: 8.61% of the `prizePool` is set aside for agent commissions.
     - **Calculation**: `agentsCommissionTotal = (prizePool * 861) / 10000`
   
4. **Agent Commission Payout**:
   - **Distribution**:
     - Each agent's commission is paid out based on the number of tickets sold by that agent.
     - The commission is directly transferred to the agent’s address from the `prizePool`.
   - **Commission Reset**: After payout, each agent’s commission balance is reset to zero.

5. **Prize Pool Reset**:
   - After all agent commissions are paid out and the prize distribution is executed, the `prizePool` is reset to zero.

6. **Prize Claiming**:
   - Players can claim their winnings based on their match count with the winning numbers. The exact method for calculating player prizes is not detailed in the provided code but generally involves matching player numbers with winning numbers.

### Summary of Distribution Calculation

- **Gross Prize Money**: 43.35% of the `prizePool`
- **Agent Commissions**: 8.61% of the `prizePool`

### Key Contract Functions Related to Prize Calculation

**`distributePrizes()`**:
   - Responsible for calculating and distributing the prize money and agent commissions based on the percentages defined.
   - Resets the `prizePool` after distribution.

**`fulfillRandomWords(uint256, uint256[] memory _randomWords)`**:
   - Called by Chainlink VRF Coordinator when random numbers are ready. The winning numbers are generated from the random words.

### Additional Details

- The actual allocation of player prizes is not explicitly detailed in the `distributePrizes()` function in the provided code. Typically, player prizes are determined based on the number of matching numbers between the player's ticket and the winning numbers, but this logic would need to be implemented or referenced from the complete contract.

- Ensure that all percentages and distributions comply with the intended business rules and legal requirements for lottery or raffle systems in the relevant jurisdiction.