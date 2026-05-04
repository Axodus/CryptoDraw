# CryptoDraw Smart Contracts Implementation

## Overview

This implementation provides a complete smart contract system for CryptoDraw lottery on the Harmony blockchain, supporting two game types: **SuperSete** and **EasyLotto** (Lotofácil rebrand).

## Harmony Blockchain Requirements

- **EVM Version**: Paris (v0.8.18)
- **OpenZeppelin Version**: 4.9.6 (4.9.x series)
- **Network**: Harmony One

## Architecture

### Core Contracts

#### 1. **CryptoDrawV2.sol** - Main Contract
The central contract managing the lottery system.

**Key Features:**
- Two game types support (SuperSete and EasyLotto)
- Multi-token payment system (deppegs)
- USD-based ticket pricing
- Prize payments in wONE/ONE native
- Role-based access control (Admin, Operator, Agent)
- Pausable for emergency stops
- Revenue distribution configuration
- Agent commission system (8.61% default)

**Main Functions:**
```solidity
// Buy a ticket
function buyTicket(
    GameType game,
    uint8[] calldata numbers,
    uint8 rounds,              // 1-6 rounds
    address paymentToken,
    uint256 maxPaymentAmount,  // Slippage protection
    address agent              // Optional agent
) external payable returns (uint256 ticketId)

// Close draw and determine winners
function closeDraw(GameType game, uint32 drawId, uint256 randomness) external

// Claim prize
function claimPrize(uint256 ticketId) external

// Withdraw prizes
function withdrawPrize() external

// Agent commission withdrawal
function withdrawAgentCommission() external
```

**Admin Functions:**
```solidity
// Configure game parameters
function setGameConfig(GameType game, uint256 ticketPriceUSD, uint256 drawInterval, bool enabled)

// Configure revenue distribution
function setRevenueConfig(RevenueConfig calldata _config)

// Manage supported payment tokens
function setSupportedToken(address token, bool supported)

// Suspend/activate agents
function setSuspendedAgent(address agent, bool suspended)

// Update destination wallets
function setWallets(...)

// Emergency functions
function pause()
function unpause()
function emergencyWithdraw(address token, address to, uint256 amount)
```

#### 2. **TicketNFT.sol** - NFT Tickets
Non-transferable (soulbound) NFT representing lottery tickets.

**Features:**
- Two game types support
- Packed number storage (uint32) for gas efficiency
- Multi-round tickets (1-6 rounds)
- Ticket status tracking (Active, Expired, Redeemed, Burned)
- Enhanced metadata with game information

**Data Structure:**
```solidity
struct Ticket {
    address player;
    GameType game;
    uint32 numbersPacked;      // Compact number representation
    uint256 drawRound;
    uint8 roundsBought;
    uint8 roundsRemaining;
    uint256 createdAt;
    TicketStatus status;
}
```

#### 3. **PriceOracle.sol** - Price Conversion
Oracle for USD price conversion supporting multiple tokens.

**Features:**
- Multi-token support (deppegs)
- USD price tracking with 18 decimal precision
- Conversion to/from USD
- Price staleness protection
- Batch price updates

**Key Functions:**
```solidity
function getUSDPrice(address token) external view returns (uint256 price)
function convertToUSD(address token, uint256 amount) external view returns (uint256 usdValue)
function convertFromUSD(address token, uint256 usdAmount) external view returns (uint256 tokenAmount)
function updatePrice(address token, uint256 newPrice) external
function addToken(address token, uint8 decimals, uint256 initialPrice) external
```

#### 4. **GameLibrary.sol** - Number Manipulation
Library for number packing, validation, and winning generation.

**EasyLotto Functions:**
- **Format**: 15-20 numbers from 1-25, packed as 25-bit bitmask
- `validateEasyLottoNumbers(uint8[] numbers)` - Validates number selection
- `packEasyLottoNumbers(uint8[] numbers)` - Packs into uint32
- `unpackEasyLottoNumbers(uint32 packed)` - Unpacks from uint32
- `countEasyLottoMatches(uint32, uint32)` - Counts matching numbers
- `generateEasyLottoWinning(uint256 randomness, uint32 drawId)` - Generates winners

**SuperSete Functions:**
- **Format**: 7 columns of 0-9, packed as 7×4-bit nibbles (28 bits)
- `validateSuperSevenNumbers(uint8[] columns)` - Validates column selection
- `packSuperSevenNumbers(uint8[] columns)` - Packs into uint32
- `unpackSuperSevenNumbers(uint32 packed)` - Unpacks from uint32
- `countSuperSevenMatches(uint32, uint32)` - Counts matching columns
- `generateSuperSevenWinning(uint256 randomness, uint32 drawId)` - Generates winners

## Game Specifications

### EasyLotto (Lotofácil)
- **Numbers**: Select 15-20 numbers from 1 to 25
- **Packing**: 25-bit bitmask (bit 0 = number 1, bit 24 = number 25)
- **Prizes**: 11-15 matches (11=5%, 12=10%, 13=15%, 14=20%, 15=50% of prize pool)
- **Default Interval**: 4 days

### SuperSete
- **Numbers**: 7 columns, each 0-9
- **Packing**: 7 nibbles of 4 bits each (bits 0-3 = col1, 4-7 = col2, ..., 24-27 = col7)
- **Prizes**: 3-7 column matches (3=5%, 4=10%, 5=15%, 6=20%, 7=50% of prize pool)
- **Default Interval**: 1 week

## Revenue Distribution

Default configuration (base 10000 = 100%):

```
Prizes:           43.35% (4335)  - Player prizes
Agent Commission:  8.61% (861)   - Agent commissions
Project Fund:     20.00% (2000)  - Project development
Grant Fund:       15.00% (1500)  - Community grants
Operation Fund:   13.04% (1304)  - Operations
```

**Configurable via `setRevenueConfig()`**

## Payment System

### Supported Tokens (Deppegs)
- Configured via `setSupportedToken(address, bool)`
- Each token must be added to PriceOracle with current USD price
- Native ONE token supported (address(0))

### Payment Flow
1. User selects game, numbers, rounds, and payment token
2. Contract calculates USD price: `ticketPriceUSD × rounds`
3. PriceOracle converts to token amount
4. User approves token (if ERC20) or sends native ONE
5. Payment sent to `treasuryWallet`
6. NFT ticket minted
7. Agent commission recorded (if applicable)

## Prize System

### Prize Calculation
- Based on number of matches
- Percentage of total prize pool
- Distributed proportionally among winners

### Prize Withdrawal
- **Pull Pattern**: Winners accumulate balance
- Call `claimPrize(ticketId)` to add prize to balance
- Call `withdrawPrize()` to receive payment in wONE/ONE
- Paid from `prizeWallet`

## Security Features

### Access Control
- **DEFAULT_ADMIN_ROLE**: Super admin (emergency functions)
- **ADMIN_ROLE**: Configure games, tokens, revenue, wallets
- **OPERATOR_ROLE**: Close draws, manage operations
- **AGENT_ROLE**: Authorized to receive commissions

### Protection Mechanisms
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop mechanism
- **Slippage Protection**: `maxPaymentAmount` parameter
- **Pull Pattern**: Safe withdrawal mechanism
- **Input Validation**: Number validation, range checks
- **Non-transferable NFTs**: Tickets are soulbound

### Emergency Functions
```solidity
function pause() external onlyRole(ADMIN_ROLE)
function unpause() external onlyRole(ADMIN_ROLE)
function emergencyWithdraw(address token, address to, uint256 amount) 
    external onlyRole(DEFAULT_ADMIN_ROLE)
```

## Agent System

### Agent Management
- Authorized via `grantRole(AGENT_ROLE, agentAddress)`
- Can be suspended via `setSuspendedAgent(agent, true)`
- Suspended agents cannot earn new commissions

### Commission System
- Default: 8.61% of ticket price (configurable)
- Tracked per agent in `agentCommissions` mapping
- Withdrawn via `withdrawAgentCommission()`
- Paid in ONE native

## Deployment Guide

### Prerequisites
1. Deploy TicketNFT contract
2. Deploy PriceOracle with initial ONE price
3. Prepare wallet addresses:
   - Treasury wallet (receives ticket payments)
   - Prize wallet (pays winners)
   - Project fund
   - Grant fund
   - Operation fund

### Deployment Steps
1. Deploy CryptoDrawV2 with constructor parameters
2. Set TicketNFT's CryptoDraw address
3. Add supported payment tokens to PriceOracle
4. Add supported payment tokens to CryptoDraw
5. Grant AGENT_ROLE to authorized agents
6. Configure game parameters if needed
7. Test with small amounts first

### Initial Configuration
```solidity
// 1. Add wONE token support
priceOracle.addToken(wONEAddress, 18, initialPrice);
cryptoDraw.setSupportedToken(wONEAddress, true);

// 2. Add other deppegs
priceOracle.addToken(tokenAddress, decimals, initialPrice);
cryptoDraw.setSupportedToken(tokenAddress, true);

// 3. Configure agents
cryptoDraw.grantRole(AGENT_ROLE, agentAddress);

// 4. Update game config if needed
cryptoDraw.setGameConfig(GameType.EASYLOTTO, 1e18, 4 days, true);
```

## Testing Checklist

- [ ] Ticket purchase with native ONE
- [ ] Ticket purchase with ERC20 tokens
- [ ] Multi-round ticket purchase
- [ ] Number validation (valid and invalid cases)
- [ ] Draw closing and winner generation
- [ ] Prize calculation for all match levels
- [ ] Prize claiming and withdrawal
- [ ] Agent commission accumulation
- [ ] Agent commission withdrawal
- [ ] Pause/unpause functionality
- [ ] Emergency withdrawal
- [ ] Access control enforcement
- [ ] Reentrancy protection
- [ ] Gas optimization validation

## Optimization Notes

### Gas Efficiency
- **Custom Errors**: Uses custom errors instead of require strings
- **Packed Storage**: Numbers packed into uint32 (vs array storage)
- **Batch Operations**: Price updates support batch mode
- **Pull Pattern**: Withdrawals don't iterate

### Storage Optimization
- Numbers packed: 25 bits (EasyLotto) or 28 bits (SuperSete)
- Minimal on-chain storage
- Status encoded in enums

## Upgrade Path

This implementation is not upgradeable by design for security. For upgrades:
1. Deploy new version of contracts
2. Pause old contracts
3. Migrate state if needed
4. Redirect frontend to new contracts

## Support & Maintenance

### Monitoring
- Track events for all operations
- Monitor prize pool balances
- Watch for failed transactions
- Check price oracle staleness

### Maintenance Tasks
- Update token prices regularly (hourly recommended)
- Monitor draw schedules
- Ensure prize wallet has sufficient funds
- Review agent performance
- Audit revenue distribution

## License
MIT License

## Version
v2.0.0 - Complete implementation for Harmony blockchain
