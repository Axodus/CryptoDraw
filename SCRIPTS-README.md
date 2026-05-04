# CryptoDraw Package.json Documentation

## 📦 Dependencies

### Production Dependencies
- **dotenv**: Environment variable management
- **@openzeppelin/contracts**: Secure smart contract library (v4.9.6 for Harmony compatibility)
- **ethers**: Ethereum JavaScript library (v5.x for compatibility)

### Development Dependencies
- **hardhat**: Ethereum development environment
- **@nomiclabs/hardhat-ethers**: Hardhat ethers integration
- **@nomiclabs/hardhat-etherscan**: Contract verification
- **@nomiclabs/hardhat-waffle**: Testing framework
- **chai**: Assertion library
- **solhint**: Solidity linter
- **prettier**: Code formatter
- **husky**: Git hooks
- **concurrently**: Run multiple commands

## 🚀 NPM Scripts

### 📋 Basic Operations
```bash
npm run compile          # Compile contracts
npm run clean            # Clean artifacts
npm run test             # Run tests
npm run test:coverage    # Run tests with coverage
npm run test:gas         # Run tests with gas reporting
```

### 🌐 Network Operations
```bash
npm run deploy:local     # Deploy to local hardhat network
npm run deploy:testnet   # Deploy to Harmony testnet
npm run deploy:mainnet   # Deploy to Harmony mainnet
npm run verify:testnet   # Verify contracts on testnet
npm run verify:mainnet   # Verify contracts on mainnet
```

### ⚙️ Environment Setup
```bash
npm run setup:dev        # Setup development environment
npm run setup:prod       # Setup production environment  
npm run setup:env        # Interactive environment setup
```

### 💰 Funding & Testing
```bash
npm run fund:testnet     # Fund test accounts with ONE
npm run fund:local       # Fund local accounts
npm run interact:testnet # Interactive contract console (testnet)
npm run interact:mainnet # Interactive contract console (mainnet)
```

### 👨‍💼 Administrative Operations
```bash
npm run admin:pause      # Emergency pause contract
npm run admin:unpause    # Unpause contract
npm run admin:withdraw   # Emergency withdrawal
npm run price:update     # Update token prices
npm run draw:create      # Create new draw
npm run draw:execute     # Execute draw
```

### 👤 Agent Management
```bash
npm run agent:add        # Add new agent
npm run agent:remove     # Remove agent
```

### 📊 Monitoring & Stats
```bash
npm run monitoring       # Health check
npm run stats           # Game statistics
```

### 🔧 Development Tools
```bash
npm run format          # Format code with prettier
npm run lint            # Lint Solidity code
npm run lint:fix        # Auto-fix linting issues
npm run docs            # Generate documentation
npm run analyze         # Security analysis with slither
npm run security        # Security analysis with mythril
```

### 🏗️ Build & Development
```bash
npm run build           # Full build (compile + docs)
npm run dev             # Start full development environment
npm run start:backend   # Start backend server
npm run start:frontend  # Start frontend development server
```

### 💾 Backup Operations
```bash
npm run backup:contracts    # Backup contracts
npm run backup:deployments  # Backup deployment files
```

### 🎮 Game Operations
```bash
npm run draw:create     # Create new lottery draw
npm run draw:execute    # Execute/finalize draw
npm run price:update    # Update token prices in oracle
```

## 🔧 Script Descriptions

### Core Deployment Scripts
- **deploy-harmony.js**: Main deployment script for Harmony network
- **verify.js**: Contract verification on Harmony explorer
- **fund-accounts.js**: Fund test accounts with ONE tokens
- **interact.js**: Interactive contract management console

### Administrative Scripts
- **admin/pause-contract.js**: Emergency pause functionality
- **admin/unpause-contract.js**: Resume contract operations
- **admin/emergency-withdraw.js**: Emergency fund withdrawal

### Utility Scripts
- **update-prices.js**: Update token prices in PriceOracle
- **upgrade.js**: Contract upgrade procedures (if upgradeable)

## ⚡ Quick Start Commands

### First Time Setup
```bash
# Install dependencies
npm install

# Setup development environment
npm run setup:dev

# Edit .env file with your configuration
nano .env

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet
```

### Daily Development
```bash
# Start development environment
npm run dev

# Run specific tests
npm run test:gas

# Deploy changes
npm run deploy:testnet

# Interact with contracts
npm run interact:testnet
```

### Production Deployment
```bash
# Setup production environment
npm run setup:prod

# Verify production .env configuration
cat .env

# Deploy to mainnet
npm run deploy:mainnet

# Verify contracts
npm run verify:mainnet
```

## 🛡️ Security Features

### Git Hooks (Husky)
- **pre-commit**: Runs linting and formatting
- **pre-push**: Runs full test suite

### Code Quality
- **Solhint**: Solidity code linting
- **Prettier**: Consistent code formatting
- **Coverage**: Test coverage reporting
- **Gas Reporter**: Gas usage analysis

## 🌐 Supported Networks

### Harmony Mainnet
- Chain ID: 1666600000
- RPC: https://api.harmony.one
- Explorer: https://explorer.harmony.one

### Harmony Testnet  
- Chain ID: 1666700000
- RPC: https://api.s0.b.hmny.io
- Explorer: https://explorer.testnet.harmony.one

### Local Development
- Hardhat Network: 31337
- Localhost: 127.0.0.1:8545

## 📁 Project Structure
```
CryptoDraw/
├── contracts/           # Solidity contracts
├── scripts/            # Deployment & utility scripts  
│   ├── admin/         # Administrative scripts
│   └── agent/         # Agent management scripts
├── test/              # Contract tests
├── backend/           # Node.js backend
├── frontend/          # React frontend
├── docs/              # Documentation
└── deployments/       # Deployment artifacts
```