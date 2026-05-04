# Scripts - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém scripts de deployment, utilitários e automação para o projeto CryptoDraw. Implementar scripts robustos para deployment multi-rede, configuração e operações administrativas.

## Estrutura de Scripts

```
scripts/
├── deploy/                 # Scripts de deployment
├── config/                # Scripts de configuração
├── admin/                 # Scripts administrativos
├── utils/                 # Utilitários diversos
├── monitoring/            # Scripts de monitoramento
└── migrations/            # Scripts de migração
```

## 1. Scripts de Deployment

### 1.1 Deploy Principal
**Arquivo**: `deploy/deploy.js` (melhorar o existente)

```javascript
const { ethers, upgrades } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Iniciando deployment do CryptoDraw...");
    
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await deployer.getBalance()), "ETH");
    
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "- ChainId:", network.chainId);
    
    // 1. Deploy PriceOracle
    console.log("\n1️⃣ Deploying PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
    console.log("✅ PriceOracle deployed to:", await priceOracle.getAddress());
    
    // 2. Deploy RandomnessProvider (Chainlink VRF)
    console.log("\n2️⃣ Deploying RandomnessProvider...");
    const RandomnessProvider = await ethers.getContractFactory("RandomnessProvider");
    const randomnessProvider = await RandomnessProvider.deploy(
        getVRFConfig(network.chainId).coordinator,
        getVRFConfig(network.chainId).keyHash
    );
    await randomnessProvider.waitForDeployment();
    console.log("✅ RandomnessProvider deployed to:", await randomnessProvider.getAddress());
    
    // 3. Deploy TicketNFT
    console.log("\n3️⃣ Deploying TicketNFT...");
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    await ticketNFT.waitForDeployment();
    console.log("✅ TicketNFT deployed to:", await ticketNFT.getAddress());
    
    // 4. Deploy CryptoDraw (Main Contract)
    console.log("\n4️⃣ Deploying CryptoDraw...");
    const CryptoDraw = await ethers.getContractFactory("CryptoDraw");
    const cryptoDraw = await CryptoDraw.deploy(
        await ticketNFT.getAddress(),
        await priceOracle.getAddress(),
        await randomnessProvider.getAddress()
    );
    await cryptoDraw.waitForDeployment();
    console.log("✅ CryptoDraw deployed to:", await cryptoDraw.getAddress());
    
    // 5. Deploy PoolManager
    console.log("\n5️⃣ Deploying PoolManager...");
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(await cryptoDraw.getAddress());
    await poolManager.waitForDeployment();
    console.log("✅ PoolManager deployed to:", await poolManager.getAddress());
    
    // 6. Setup permissions and configurations
    console.log("\n6️⃣ Setting up contracts...");
    
    // Set CryptoDraw address in TicketNFT
    await ticketNFT.setCryptoDrawContract(await cryptoDraw.getAddress());
    console.log("✅ TicketNFT configured");
    
    // Set initial game parameters
    await cryptoDraw.setGameParameters(1, { // LOTOFACIL
        ticketPrice: ethers.parseEther("0.025"), // $25 equivalent
        roundsInterval: 24 * 3600, // 24 hours
        cutoffHours: 3,
        prizeTiers: [50, 20, 15, 10, 5] // Percentage distribution
    });
    
    await cryptoDraw.setGameParameters(2, { // SUPERSETE
        ticketPrice: ethers.parseEther("0.02"), // $20 equivalent
        roundsInterval: 7 * 24 * 3600, // 1 week
        cutoffHours: 3,
        prizeTiers: [40, 25, 20, 10, 5]
    });
    console.log("✅ Game parameters configured");
    
    // 7. Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            CryptoDraw: await cryptoDraw.getAddress(),
            TicketNFT: await ticketNFT.getAddress(),
            PriceOracle: await priceOracle.getAddress(),
            RandomnessProvider: await randomnessProvider.getAddress(),
            PoolManager: await poolManager.getAddress()
        },
        transactionHashes: {
            // TODO: capture transaction hashes
        }
    };
    
    const deployDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deployDir)) {
        fs.mkdirSync(deployDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(deployDir, `${network.name}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📄 Deployment info saved to:", `deployments/${network.name}.json`);
    
    // 8. Verify contracts (if not local network)
    if (network.chainId !== 31337) {
        console.log("\n🔍 Contract verification will start in 30 seconds...");
        setTimeout(() => {
            verifyContracts(deploymentInfo);
        }, 30000);
    }
}

function getVRFConfig(chainId) {
    const configs = {
        1: { // Mainnet
            coordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
            keyHash: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"
        },
        5: { // Goerli
            coordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D", 
            keyHash: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15"
        }
    };
    
    return configs[chainId] || configs[5]; // Default to Goerli
}

async function verifyContracts(deploymentInfo) {
    const { run } = require("hardhat");
    
    console.log("🔍 Starting contract verification...");
    
    try {
        for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
            console.log(`Verifying ${name} at ${address}...`);
            
            await run("verify:verify", {
                address: address,
                constructorArguments: getConstructorArgs(name, deploymentInfo)
            });
            
            console.log(`✅ ${name} verified`);
        }
    } catch (error) {
        console.error("❌ Verification error:", error);
    }
}

function getConstructorArgs(contractName, deploymentInfo) {
    switch (contractName) {
        case 'CryptoDraw':
            return [
                deploymentInfo.contracts.TicketNFT,
                deploymentInfo.contracts.PriceOracle,
                deploymentInfo.contracts.RandomnessProvider
            ];
        case 'PoolManager':
            return [deploymentInfo.contracts.CryptoDraw];
        default:
            return [];
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };
```

### 1.2 Deploy por Etapas
**Arquivo**: `deploy/deploy-staged.js`

```javascript
// Para deployments em produção com pauses para verificação
const { ethers } = require("hardhat");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function deployWithConfirmation() {
    console.log("🎯 Staged Deployment - CryptoDraw");
    console.log("This deployment requires manual confirmation at each step.\n");
    
    // Stage 1: Oracle and Infrastructure
    const continueStage1 = await askQuestion("Deploy Stage 1 (Oracle & RandomnessProvider)? (y/n): ");
    if (continueStage1.toLowerCase() !== 'y') {
        console.log("Deployment cancelled");
        process.exit(0);
    }
    
    // Deploy Stage 1...
    console.log("Deploying Stage 1...");
    
    // Stage 2: Core Contracts
    const continueStage2 = await askQuestion("Deploy Stage 2 (Core Contracts)? (y/n): ");
    if (continueStage2.toLowerCase() !== 'y') {
        console.log("Deployment stopped at Stage 1");
        process.exit(0);
    }
    
    // Deploy Stage 2...
    
    rl.close();
}

if (require.main === module) {
    deployWithConfirmation();
}
```

### 1.3 Deploy para Testnet
**Arquivo**: `deploy/deploy-testnet.js`

```javascript
// Deployment específico para testes com dados mock
async function deployTestnet() {
    console.log("🧪 Deploying to Testnet with test data...");
    
    // Deploy contracts
    await main();
    
    // Add test data
    await setupTestData();
}

async function setupTestData() {
    console.log("📋 Setting up test data...");
    
    // Create test draws
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", deployedAddress);
    
    // Create future draws for testing
    const now = Math.floor(Date.now() / 1000);
    const scheduledTimes = [
        now + 3600,    // 1 hour from now
        now + 7200,    // 2 hours from now
        now + 10800    // 3 hours from now
    ];
    
    for (let i = 0; i < scheduledTimes.length; i++) {
        await cryptoDraw.createDraw(1, scheduledTimes[i]); // Lotofácil
        await cryptoDraw.createDraw(2, scheduledTimes[i] + 1800); // SuperSete
        console.log(`✅ Test draws created for ${new Date(scheduledTimes[i] * 1000)}`);
    }
}
```

## 2. Scripts de Configuração

### 2.1 Setup Environment
**Arquivo**: `config/setup-env.js`

```javascript
const fs = require('fs');
const path = require('path');

async function setupEnvironment() {
    console.log("🔧 Setting up environment configuration...");
    
    const networkConfig = await getNetworkConfig();
    const envConfig = generateEnvConfig(networkConfig);
    
    // Write backend .env
    fs.writeFileSync(
        path.join(__dirname, '../../backend/.env'),
        envConfig.backend
    );
    
    // Write frontend .env.local
    fs.writeFileSync(
        path.join(__dirname, '../../frontend/.env.local'),
        envConfig.frontend
    );
    
    console.log("✅ Environment files created");
}

function generateEnvConfig(networkConfig) {
    const backend = `
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cryptodraw
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain
MAINNET_RPC_URL=${networkConfig.mainnet.rpc}
GOERLI_RPC_URL=${networkConfig.goerli.rpc}
MAINNET_CONTRACT_ADDRESS=${networkConfig.mainnet.contract}
GOERLI_CONTRACT_ADDRESS=${networkConfig.goerli.contract}

# Consolidator
CONSOLIDATOR_PRIVATE_KEY=${networkConfig.consolidator.privateKey}
GAS_LIMIT=500000

# API
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-here
`;

    const frontend = `
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Blockchain
NEXT_PUBLIC_MAINNET_RPC_URL=${networkConfig.mainnet.rpc}
NEXT_PUBLIC_GOERLI_RPC_URL=${networkConfig.goerli.rpc}
NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET=${networkConfig.mainnet.contract}
NEXT_PUBLIC_CONTRACT_ADDRESS_GOERLI=${networkConfig.goerli.contract}

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
`;

    return { backend, frontend };
}
```

### 2.2 Configure Oracle Prices
**Arquivo**: `config/setup-oracle.js`

```javascript
async function setupPriceOracle() {
    console.log("💰 Configuring Price Oracle...");
    
    const priceOracle = await ethers.getContractAt("PriceOracle", oracleAddress);
    
    // Set price feeds for different tokens
    const priceFeeds = {
        ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Mainnet ETH/USD
        USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", // Mainnet USDC/USD
        // Add more feeds as needed
    };
    
    for (const [token, feed] of Object.entries(priceFeeds)) {
        await priceOracle.setPriceFeed(token, feed);
        console.log(`✅ ${token} price feed configured`);
    }
}
```

## 3. Scripts Administrativos

### 3.1 Create Draw
**Arquivo**: `admin/create-draw.js`

```javascript
const { ethers } = require("hardhat");

async function createDraw(gameType, scheduledDate) {
    console.log(`🎲 Creating new draw for ${gameType === 1 ? 'Lotofácil' : 'SuperSete'}...`);
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
    
    const scheduledTimestamp = Math.floor(new Date(scheduledDate).getTime() / 1000);
    
    const tx = await cryptoDraw.createDraw(gameType, scheduledTimestamp);
    const receipt = await tx.wait();
    
    const event = receipt.events.find(e => e.event === 'DrawCreated');
    const drawId = event.args.drawId;
    
    console.log(`✅ Draw created with ID: ${drawId}`);
    console.log(`📅 Scheduled for: ${scheduledDate}`);
    console.log(`⏰ Cutoff at: ${new Date((scheduledTimestamp - 3 * 3600) * 1000)}`);
    
    return drawId;
}

// CLI interface
if (require.main === module) {
    const [,, gameType, scheduledDate] = process.argv;
    
    if (!gameType || !scheduledDate) {
        console.log("Usage: node create-draw.js <gameType> <scheduledDate>");
        console.log("Example: node create-draw.js 1 '2023-10-15T20:00:00Z'");
        process.exit(1);
    }
    
    createDraw(parseInt(gameType), scheduledDate);
}
```

### 3.2 Emergency Pause
**Arquivo**: `admin/emergency-pause.js`

```javascript
async function emergencyPause() {
    console.log("🚨 EMERGENCY PAUSE - CryptoDraw");
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
    
    // Check if already paused
    const isPaused = await cryptoDraw.paused();
    if (isPaused) {
        console.log("⚠️ Contract is already paused");
        return;
    }
    
    // Pause contract
    const tx = await cryptoDraw.pause();
    await tx.wait();
    
    console.log("✅ Contract paused successfully");
    console.log("🔒 All user interactions are now blocked");
    console.log("📞 Contact admin to unpause when issue is resolved");
}

async function emergencyUnpause() {
    console.log("🔓 EMERGENCY UNPAUSE - CryptoDraw");
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
    
    const tx = await cryptoDraw.unpause();
    await tx.wait();
    
    console.log("✅ Contract unpaused successfully");
    console.log("🟢 Normal operations resumed");
}

// CLI
const action = process.argv[2];
if (action === 'pause') {
    emergencyPause();
} else if (action === 'unpause') {
    emergencyUnpause();
} else {
    console.log("Usage: node emergency-pause.js <pause|unpause>");
}
```

### 3.3 Withdraw Funds
**Arquivo**: `admin/withdraw-funds.js`

```javascript
async function withdrawFunds(amount, recipient) {
    console.log("💸 Withdrawing contract funds...");
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
    
    // Check contract balance
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log(`💰 Contract balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther(amount)) {
        throw new Error("Insufficient contract balance");
    }
    
    // Withdraw
    const tx = await cryptoDraw.withdrawFunds(
        ethers.parseEther(amount),
        recipient || await cryptoDraw.owner()
    );
    await tx.wait();
    
    console.log(`✅ Withdrawn ${amount} ETH to ${recipient}`);
}
```

## 4. Scripts de Utilitários

### 4.1 Verify Deployment
**Arquivo**: `utils/verify-deployment.js`

```javascript
async function verifyDeployment(networkName) {
    console.log(`🔍 Verifying deployment on ${networkName}...`);
    
    const deployment = JSON.parse(
        fs.readFileSync(path.join(__dirname, `../deployments/${networkName}.json`))
    );
    
    const checks = [];
    
    // Check contract deployments
    for (const [name, address] of Object.entries(deployment.contracts)) {
        const code = await ethers.provider.getCode(address);
        checks.push({
            contract: name,
            address: address,
            deployed: code !== '0x',
            codeSize: code.length
        });
    }
    
    // Check contract interactions
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", deployment.contracts.CryptoDraw);
    
    try {
        const gameParams = await cryptoDraw.gameParameters(1);
        checks.push({
            test: "Game parameters configured",
            passed: gameParams.ticketPrice > 0
        });
    } catch (error) {
        checks.push({
            test: "Game parameters configured",
            passed: false,
            error: error.message
        });
    }
    
    // Generate report
    console.table(checks);
    
    const allPassed = checks.every(check => check.passed !== false);
    console.log(allPassed ? "✅ All checks passed" : "❌ Some checks failed");
    
    return allPassed;
}
```

### 4.2 Generate ABI
**Arquivo**: `utils/generate-abi.js`

```javascript
async function generateABI() {
    console.log("📋 Generating ABI files...");
    
    const contracts = ['CryptoDraw', 'TicketNFT', 'PoolManager'];
    const outputDir = path.join(__dirname, '../abis');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    for (const contractName of contracts) {
        const artifact = await hre.artifacts.readArtifact(contractName);
        
        // Save ABI
        fs.writeFileSync(
            path.join(outputDir, `${contractName}.json`),
            JSON.stringify(artifact.abi, null, 2)
        );
        
        // Generate TypeScript types
        const typesContent = generateTypescriptTypes(contractName, artifact.abi);
        fs.writeFileSync(
            path.join(outputDir, `${contractName}.types.ts`),
            typesContent
        );
        
        console.log(`✅ ${contractName} ABI and types generated`);
    }
}

function generateTypescriptTypes(contractName, abi) {
    // Generate TypeScript interfaces from ABI
    // This is a simplified version - use tools like typechain for full implementation
    return `
export interface ${contractName}Events {
    // Generated from ABI events
}

export interface ${contractName}Functions {
    // Generated from ABI functions
}
`;
}
```

### 4.3 Health Check
**Arquivo**: `utils/health-check.js`

```javascript
async function performHealthCheck() {
    console.log("🏥 Performing system health check...");
    
    const results = {
        contracts: {},
        backend: {},
        frontend: {},
        blockchain: {}
    };
    
    // Check contracts
    try {
        const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
        results.contracts.cryptoDraw = await cryptoDraw.paused() === false;
        
        const latestDraw = await cryptoDraw.getCurrentDraw(1);
        results.contracts.hasActiveDraws = latestDraw.id > 0;
    } catch (error) {
        results.contracts.error = error.message;
    }
    
    // Check backend API
    try {
        const response = await fetch('http://localhost:3001/health');
        results.backend.api = response.ok;
        results.backend.status = response.status;
    } catch (error) {
        results.backend.error = error.message;
    }
    
    // Check blockchain connection
    try {
        const blockNumber = await ethers.provider.getBlockNumber();
        results.blockchain.connected = true;
        results.blockchain.latestBlock = blockNumber;
    } catch (error) {
        results.blockchain.error = error.message;
    }
    
    console.table(results);
    
    return results;
}
```

## 5. Scripts de Monitoramento

### 5.1 Monitor Events
**Arquivo**: `monitoring/event-monitor.js`

```javascript
async function monitorEvents() {
    console.log("👁️ Starting event monitoring...");
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", contractAddress);
    
    // Monitor TicketMinted events
    cryptoDraw.on("TicketMinted", (ticketId, owner, game, drawId, event) => {
        console.log(`🎫 New ticket minted: ${ticketId} for ${owner}`);
        
        // Send notification or update database
        notifyTicketMinted(ticketId, owner, game, drawId);
    });
    
    // Monitor DrawConsolidated events
    cryptoDraw.on("DrawConsolidated", (drawId, merkleRoot, totalPool, event) => {
        console.log(`📊 Draw ${drawId} consolidated with pool ${ethers.formatEther(totalPool)} ETH`);
        
        // Trigger randomness request
        scheduleRandomnessRequest(drawId);
    });
    
    // Monitor PrizeClaimed events
    cryptoDraw.on("PrizeClaimed", (ticketId, claimant, amount, event) => {
        console.log(`🏆 Prize claimed: ${ethers.formatEther(amount)} ETH by ${claimant}`);
    });
    
    console.log("✅ Event monitoring active");
}

async function notifyTicketMinted(ticketId, owner, game, drawId) {
    // Implementation for notifications (webhook, email, etc.)
}

async function scheduleRandomnessRequest(drawId) {
    // Implementation to schedule randomness request job
}
```

### 5.2 Gas Monitor
**Arquivo**: `monitoring/gas-monitor.js`

```javascript
async function monitorGasPrices() {
    console.log("⛽ Starting gas price monitoring...");
    
    setInterval(async () => {
        const gasPrice = await ethers.provider.getGasPrice();
        const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
        
        console.log(`Current gas price: ${gasPriceGwei} Gwei`);
        
        // Alert if gas price is too high
        if (parseFloat(gasPriceGwei) > 50) {
            console.log("🚨 High gas alert! Consider delaying transactions");
        }
        
        // Log to monitoring service
        logGasPrice(gasPriceGwei);
        
    }, 60000); // Check every minute
}

function logGasPrice(gasPriceGwei) {
    // Send to monitoring service (Prometheus, etc.)
}
```

## 6. Package.json Scripts

**Arquivo**: `package.json` (adicionar ao principal)

```json
{
  "scripts": {
    "deploy": "hardhat run scripts/deploy/deploy.js",
    "deploy:testnet": "hardhat run scripts/deploy/deploy-testnet.js --network goerli",
    "deploy:mainnet": "hardhat run scripts/deploy/deploy.js --network mainnet",
    "deploy:staged": "node scripts/deploy/deploy-staged.js",
    
    "setup:env": "node scripts/config/setup-env.js",
    "setup:oracle": "node scripts/config/setup-oracle.js",
    
    "admin:create-draw": "node scripts/admin/create-draw.js",
    "admin:pause": "node scripts/admin/emergency-pause.js pause",
    "admin:unpause": "node scripts/admin/emergency-pause.js unpause",
    
    "verify:deployment": "node scripts/utils/verify-deployment.js",
    "generate:abi": "node scripts/utils/generate-abi.js",
    "health:check": "node scripts/utils/health-check.js",
    
    "monitor:events": "node scripts/monitoring/event-monitor.js",
    "monitor:gas": "node scripts/monitoring/gas-monitor.js",
    
    "test:contracts": "hardhat test",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:e2e": "cd tests && npx playwright test"
  }
}
```

## Checklist de Implementação

### Deploy Scripts
- [ ] Deploy principal multi-contrato
- [ ] Deploy staged com confirmações
- [ ] Deploy para testnet com dados mock
- [ ] Verificação automática de contratos
- [ ] Configuração de parâmetros iniciais

### Configuração
- [ ] Setup de environment variables
- [ ] Configuração de oracle de preços
- [ ] Setup de roles e permissões
- [ ] Configuração de redes

### Administração
- [ ] Criação de draws
- [ ] Emergency pause/unpause
- [ ] Withdrawal de fundos
- [ ] Gestão de parâmetros

### Utilitários
- [ ] Verificação de deployment
- [ ] Geração de ABIs
- [ ] Health check do sistema
- [ ] Scripts de migração

### Monitoramento
- [ ] Monitor de eventos
- [ ] Monitor de gas
- [ ] Alertas de sistema
- [ ] Logs estruturados

### Automação
- [ ] CI/CD integration
- [ ] Scheduled tasks
- [ ] Backup scripts
- [ ] Performance monitoring