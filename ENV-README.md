# 🔧 Environment Configuration Guide

## Quick Start

### 1. Choose Your Environment

```bash
# For development/testing
cp .env.development .env

# For production
cp .env.production .env

# Or use the setup script
chmod +x setup-env.sh
./setup-env.sh
```

### 2. Configure Required Values

Edit your `.env` file and update these **REQUIRED** fields:

#### 🔑 Wallet Configuration
```env
# Use your actual private key (keep secure!)
PRIVATE_KEY=0x1234...

# Update with your wallet addresses
TREASURY_WALLET=0x1234...  # Receives payment tokens
PRIZE_WALLET=0x5678...     # Holds wONE for payouts
PROJECT_FUND=0x9ABC...     # Development funding
GRANT_FUND=0xDEF0...       # Community grants
OPERATION_FUND=0x1357...   # Operational costs
```

#### 💎 Token Configuration
```env
# Harmony mainnet addresses (already configured)
WONE_ADDRESS=0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a
USDC_ADDRESS=0x985458E523dB3d53125813eD68c274899e9DfAb4
USDT_ADDRESS=0x3C2B8Be99c50593081EAA2A724F0B8285F5aba8f

# Update testnet addresses if needed
```

#### 💰 Game Configuration
```env
# Ticket prices in USD (18 decimals)
EASYLOTTO_TICKET_PRICE_USD=2000000000000000000  # $2.00
SUPERSETE_TICKET_PRICE_USD=1500000000000000000   # $1.50

# Prize distribution (total should be ≤ 10000 basis points)
PRIZE_POOL_PERCENTAGE=7000      # 70% to prizes
PROJECT_FUND_PERCENTAGE=1000    # 10% to project
TREASURY_PERCENTAGE=1000        # 10% to treasury
AGENT_COMMISSION=200           # 2% to agents
```

## Environment Files Explained

### `.env.development`
- **Purpose**: Local development and testing
- **Network**: Harmony Testnet
- **Security**: Uses test keys (safe for commits)
- **Features**: Fast draws, low prices, mock randomness

### `.env.production`
- **Purpose**: Live mainnet deployment
- **Network**: Harmony Mainnet
- **Security**: Requires real private keys (NEVER commit)
- **Features**: Real prices, official schedules

### `.env.example`
- **Purpose**: Template with all available options
- **Security**: Safe to commit (no real values)
- **Use**: Reference for all possible configurations

## Required Dependencies

### Install Node Packages
```bash
npm install dotenv
npm install --save-dev @nomiclabs/hardhat-ethers
npm install --save-dev @nomiclabs/hardhat-etherscan
```

### Environment Variables Package
The project uses `dotenv` to load environment variables:

```javascript
require('dotenv').config();
```

## Network Configuration

### Harmony Mainnet
```env
NETWORK=harmony
HARMONY_MAINNET_URL=https://api.harmony.one
HARMONY_MAINNET_CHAIN_ID=1666600000
```

### Harmony Testnet
```env
NETWORK=harmony_testnet
HARMONY_TESTNET_URL=https://api.s0.b.hmny.io
HARMONY_TESTNET_CHAIN_ID=1666700000
```

## Security Best Practices

### 🔐 Private Keys
- **Development**: Use test keys from hardhat accounts
- **Production**: Use hardware wallet or secure key management
- **Never**: Commit private keys to git

### 👥 Multi-Sig Wallets (Recommended for Production)
```env
MULTISIG_REQUIRED=true
MULTISIG_THRESHOLD=3
```

### 🚨 Emergency Features
```env
EMERGENCY_WITHDRAWAL_ENABLED=true
EMERGENCY_WALLET=0x...  # Secure backup wallet
```

## Game Configuration Options

### 🎮 Game Types
```env
# EasyLotto (Lotofácil rebrand)
# - 15 numbers from 1-25
# - Daily draws at 8 PM UTC

# SuperSete
# - 7 columns with digits 0-9  
# - Weekly draws on Wednesday 8 PM UTC
```

### 🏆 Prize Distribution
Total percentage must not exceed 100% (10000 basis points):

```env
PRIZE_POOL_PERCENTAGE=7000      # 70% - Winners
PROJECT_FUND_PERCENTAGE=1000    # 10% - Development
GRANT_FUND_PERCENTAGE=500       # 5%  - Community grants
OPERATION_FUND_PERCENTAGE=500   # 5%  - Operations
TREASURY_PERCENTAGE=1000        # 10% - Treasury/Reserve
```

### 👤 Agent Commission
```env
AGENT_COMMISSION=200  # 2% commission for reseller agents
```

## Token Support

### Native ONE
```env
NATIVE_TOKEN=0x0000000000000000000000000000000000000000
```

### Supported Deppegs on Harmony
```env
WONE_ADDRESS=0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a   # Wrapped ONE
USDC_ADDRESS=0x985458E523dB3d53125813eD68c274899e9DfAb4   # USD Coin
USDT_ADDRESS=0x3C2B8Be99c50593081EAA2A724F0B8285F5aba8f   # Tether USD
BUSD_ADDRESS=0xE176EBE47d621b984a73036B9DA5d834411ef734   # Binance USD
ETH_ADDRESS=0x6983D1E6DEf3690C4d616b13597A09e6193EA013    # Ethereum
BTC_ADDRESS=0x3095c7557bCb296ccc6e363DE01b760bA031F2d9    # Bitcoin
```

## Deployment Commands

### Development Deployment
```bash
# Using testnet
npx hardhat run scripts/deploy-harmony.js --network harmony_testnet

# Local hardhat network
npx hardhat run scripts/deploy-harmony.js --network localhost
```

### Production Deployment
```bash
# ⚠️ Make sure .env is configured with production values
npx hardhat run scripts/deploy-harmony.js --network harmony
```

### Contract Verification
```bash
# Verify on Harmony Explorer
npx hardhat verify --network harmony <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Troubleshooting

### Common Issues

1. **"Private key not set"**
   - Add `PRIVATE_KEY=0x...` to your `.env` file

2. **"Network not found"**
   - Check `NETWORK` value matches hardhat.config.js

3. **"Insufficient funds"**
   - Ensure wallet has ONE for gas fees

4. **"Token not supported"**
   - Add token to supported list in contract

### Environment Validation
```bash
# Check if environment is loaded correctly
node -e "require('dotenv').config(); console.log(process.env.NETWORK)"
```

## Support & Updates

### Configuration Updates
When updating configurations:
1. Update `.env.example` with new variables
2. Update this README with explanations
3. Update hardhat.config.js if needed
4. Test with development environment first

### Getting Help
- Check contract deployment logs
- Verify environment variables are loaded
- Test on testnet before mainnet
- Use Harmony Discord/Telegram for network issues

---

## ⚠️ Security Warning

**NEVER commit `.env` files containing real private keys or sensitive data!**

The `.gitignore` should always include:
```
.env
.env.local
.env.*.local
```