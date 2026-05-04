# Configurações de Ambiente - CryptoDraw

## Instruções para o Copilot Agent

Este diretório contém todas as configurações de ambiente, variáveis e scripts de deploy para diferentes ambientes (desenvolvimento, teste, produção). Implementar um sistema robusto de configuração com segurança adequada.

## Estrutura das Configurações

```
config/
├── environments/         # Configurações por ambiente
│   ├── development.json
│   ├── testing.json
│   ├── staging.json
│   └── production.json
├── contracts/           # Configurações de contratos
│   ├── networks.json
│   └── abis/
├── deploy/             # Scripts de deploy
│   ├── migrate.js
│   ├── verify.js
│   └── setup.js
└── secrets/            # Templates para secrets (sem valores)
    ├── .env.example
    └── secrets.template.json
```

## 1. Configurações de Ambiente

### 1.1 Development Environment
**Arquivo**: `environments/development.json`

```json
{
  "environment": "development",
  "debug": true,
  "network": {
    "name": "localhost",
    "chainId": 1337,
    "rpcUrl": "http://127.0.0.1:8545",
    "wsUrl": "ws://127.0.0.1:8545"
  },
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "cryptodraw_dev",
    "schema": "public",
    "ssl": false,
    "maxConnections": 20,
    "migrations": {
      "directory": "./migrations",
      "autoRun": true
    }
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "db": 0,
    "keyPrefix": "cryptodraw:dev:",
    "retryDelayOnFailover": 100,
    "maxRetriesPerRequest": 3
  },
  "api": {
    "host": "0.0.0.0",
    "port": 3000,
    "cors": {
      "origin": ["http://localhost:3000", "http://localhost:3001"],
      "credentials": true
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 1000,
      "message": "Too many requests from this IP"
    },
    "timeout": 30000
  },
  "websocket": {
    "port": 3001,
    "path": "/ws",
    "heartbeatInterval": 30000,
    "maxConnections": 1000
  },
  "blockchain": {
    "confirmations": 1,
    "gasLimit": "8000000",
    "gasPrice": "20000000000",
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000",
    "timeout": 300000,
    "retry": {
      "attempts": 3,
      "delay": 5000
    }
  },
  "contracts": {
    "cryptoDraw": "",
    "ticketNFT": "",
    "poolManager": "",
    "priceOracle": "",
    "randomnessProvider": "",
    "deployment": {
      "verify": false,
      "saveArtifacts": true,
      "upgradeProxy": false
    }
  },
  "lottery": {
    "drawFrequency": {
      "LOTOFACIL": "0 20 * * *",
      "SUPERSETE": "0 20 * * 3"
    },
    "cutoffHours": 3,
    "expiryDays": 14,
    "consolidationDelay": 300,
    "randomnessDelay": 600
  },
  "pricing": {
    "provider": "chainlink",
    "updateInterval": 300000,
    "fallbackProvider": "coingecko",
    "staleThreshold": 3600000
  },
  "security": {
    "jwtSecret": "dev-secret-change-in-production",
    "jwtExpiry": "24h",
    "bcryptRounds": 10,
    "csrfToken": true,
    "helmet": {
      "contentSecurityPolicy": false,
      "crossOriginEmbedderPolicy": false
    }
  },
  "logging": {
    "level": "debug",
    "format": "combined",
    "file": {
      "enabled": true,
      "path": "./logs",
      "maxSize": "10MB",
      "maxFiles": 5
    },
    "console": {
      "enabled": true,
      "colorize": true
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "port": 9090,
      "path": "/metrics"
    },
    "healthCheck": {
      "enabled": true,
      "path": "/health",
      "interval": 30000
    }
  },
  "features": {
    "pools": true,
    "statistics": true,
    "notifications": true,
    "analytics": false,
    "mockRandomness": true
  }
}
```

### 1.2 Testing Environment
**Arquivo**: `environments/testing.json`

```json
{
  "environment": "testing",
  "debug": false,
  "network": {
    "name": "hardhat",
    "chainId": 31337,
    "rpcUrl": "http://127.0.0.1:8545",
    "wsUrl": "ws://127.0.0.1:8545"
  },
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "cryptodraw_test",
    "schema": "public",
    "ssl": false,
    "maxConnections": 5,
    "migrations": {
      "directory": "./migrations",
      "autoRun": true
    }
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "db": 1,
    "keyPrefix": "cryptodraw:test:",
    "retryDelayOnFailover": 100,
    "maxRetriesPerRequest": 3
  },
  "api": {
    "host": "0.0.0.0",
    "port": 3002,
    "cors": {
      "origin": "*",
      "credentials": false
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 10000,
      "message": "Too many requests from this IP"
    },
    "timeout": 10000
  },
  "websocket": {
    "port": 3003,
    "path": "/ws",
    "heartbeatInterval": 10000,
    "maxConnections": 100
  },
  "blockchain": {
    "confirmations": 0,
    "gasLimit": "8000000",
    "gasPrice": "20000000000",
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000",
    "timeout": 60000,
    "retry": {
      "attempts": 1,
      "delay": 1000
    }
  },
  "lottery": {
    "drawFrequency": {
      "LOTOFACIL": "*/5 * * * *",
      "SUPERSETE": "*/10 * * * *"
    },
    "cutoffHours": 0.1,
    "expiryDays": 1,
    "consolidationDelay": 5,
    "randomnessDelay": 10
  },
  "pricing": {
    "provider": "mock",
    "updateInterval": 10000,
    "fallbackProvider": "mock",
    "staleThreshold": 60000
  },
  "security": {
    "jwtSecret": "test-secret",
    "jwtExpiry": "1h",
    "bcryptRounds": 4,
    "csrfToken": false,
    "helmet": false
  },
  "logging": {
    "level": "error",
    "format": "simple",
    "file": {
      "enabled": false
    },
    "console": {
      "enabled": true,
      "colorize": false
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": false
    },
    "healthCheck": {
      "enabled": false
    }
  },
  "features": {
    "pools": true,
    "statistics": false,
    "notifications": false,
    "analytics": false,
    "mockRandomness": true
  }
}
```

### 1.3 Production Environment
**Arquivo**: `environments/production.json`

```json
{
  "environment": "production",
  "debug": false,
  "network": {
    "name": "mainnet",
    "chainId": 1,
    "rpcUrl": "${ETHEREUM_RPC_URL}",
    "wsUrl": "${ETHEREUM_WS_URL}"
  },
  "database": {
    "type": "postgresql",
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "database": "${DB_NAME}",
    "schema": "public",
    "ssl": {
      "rejectUnauthorized": false
    },
    "maxConnections": 100,
    "migrations": {
      "directory": "./migrations",
      "autoRun": false
    }
  },
  "redis": {
    "host": "${REDIS_HOST}",
    "port": "${REDIS_PORT}",
    "password": "${REDIS_PASSWORD}",
    "db": 0,
    "keyPrefix": "cryptodraw:prod:",
    "retryDelayOnFailover": 1000,
    "maxRetriesPerRequest": 5,
    "tls": {}
  },
  "api": {
    "host": "0.0.0.0",
    "port": "${PORT}",
    "cors": {
      "origin": ["${FRONTEND_URL}"],
      "credentials": true
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 100,
      "message": "Too many requests from this IP"
    },
    "timeout": 60000
  },
  "websocket": {
    "port": "${WS_PORT}",
    "path": "/ws",
    "heartbeatInterval": 30000,
    "maxConnections": 10000
  },
  "blockchain": {
    "confirmations": 12,
    "gasLimit": "8000000",
    "gasPrice": "${GAS_PRICE}",
    "maxFeePerGas": "${MAX_FEE_PER_GAS}",
    "maxPriorityFeePerGas": "${MAX_PRIORITY_FEE_PER_GAS}",
    "timeout": 600000,
    "retry": {
      "attempts": 5,
      "delay": 30000
    }
  },
  "contracts": {
    "cryptoDraw": "${CONTRACT_CRYPTO_DRAW}",
    "ticketNFT": "${CONTRACT_TICKET_NFT}",
    "poolManager": "${CONTRACT_POOL_MANAGER}",
    "priceOracle": "${CONTRACT_PRICE_ORACLE}",
    "randomnessProvider": "${CONTRACT_RANDOMNESS_PROVIDER}"
  },
  "lottery": {
    "drawFrequency": {
      "LOTOFACIL": "0 20 * * *",
      "SUPERSETE": "0 20 * * 3"
    },
    "cutoffHours": 3,
    "expiryDays": 14,
    "consolidationDelay": 1800,
    "randomnessDelay": 3600
  },
  "pricing": {
    "provider": "chainlink",
    "updateInterval": 300000,
    "fallbackProvider": "coingecko",
    "staleThreshold": 3600000,
    "apiKey": "${COINGECKO_API_KEY}"
  },
  "security": {
    "jwtSecret": "${JWT_SECRET}",
    "jwtExpiry": "24h",
    "bcryptRounds": 12,
    "csrfToken": true,
    "helmet": {
      "contentSecurityPolicy": {
        "directives": {
          "defaultSrc": ["'self'"],
          "styleSrc": ["'self'", "'unsafe-inline'"],
          "scriptSrc": ["'self'"],
          "imgSrc": ["'self'", "data:", "https:"],
          "connectSrc": ["'self'", "${API_URL}", "${WS_URL}"]
        }
      },
      "hsts": {
        "maxAge": 31536000,
        "includeSubDomains": true,
        "preload": true
      }
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": {
      "enabled": true,
      "path": "/var/log/cryptodraw",
      "maxSize": "100MB",
      "maxFiles": 10
    },
    "console": {
      "enabled": false
    }
  },
  "monitoring": {
    "metrics": {
      "enabled": true,
      "port": 9090,
      "path": "/metrics"
    },
    "healthCheck": {
      "enabled": true,
      "path": "/health",
      "interval": 30000
    },
    "sentry": {
      "dsn": "${SENTRY_DSN}",
      "environment": "production"
    }
  },
  "features": {
    "pools": true,
    "statistics": true,
    "notifications": true,
    "analytics": true,
    "mockRandomness": false
  }
}
```

## 2. Configurações de Contratos

### 2.1 Networks Configuration
**Arquivo**: `contracts/networks.json`

```json
{
  "localhost": {
    "chainId": 1337,
    "name": "Localhost",
    "rpcUrl": "http://127.0.0.1:8545",
    "accounts": ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    "gasPrice": "20000000000",
    "gasMultiplier": 1.2,
    "timeout": 60000,
    "explorer": {
      "name": "Local Explorer",
      "url": "http://localhost:8000"
    }
  },
  "hardhat": {
    "chainId": 31337,
    "name": "Hardhat",
    "rpcUrl": "http://127.0.0.1:8545",
    "accounts": "hardhat",
    "gasPrice": "auto",
    "gasMultiplier": 1.0,
    "timeout": 60000
  },
  "goerli": {
    "chainId": 5,
    "name": "Goerli Testnet",
    "rpcUrl": "${GOERLI_RPC_URL}",
    "accounts": ["${PRIVATE_KEY}"],
    "gasPrice": "auto",
    "gasMultiplier": 1.2,
    "timeout": 300000,
    "verify": {
      "etherscan": {
        "apiKey": "${ETHERSCAN_API_KEY}"
      }
    },
    "explorer": {
      "name": "Goerli Etherscan",
      "url": "https://goerli.etherscan.io"
    }
  },
  "sepolia": {
    "chainId": 11155111,
    "name": "Sepolia Testnet", 
    "rpcUrl": "${SEPOLIA_RPC_URL}",
    "accounts": ["${PRIVATE_KEY}"],
    "gasPrice": "auto",
    "gasMultiplier": 1.2,
    "timeout": 300000,
    "verify": {
      "etherscan": {
        "apiKey": "${ETHERSCAN_API_KEY}"
      }
    },
    "explorer": {
      "name": "Sepolia Etherscan",
      "url": "https://sepolia.etherscan.io"
    }
  },
  "mainnet": {
    "chainId": 1,
    "name": "Ethereum Mainnet",
    "rpcUrl": "${MAINNET_RPC_URL}",
    "accounts": ["${PRIVATE_KEY}"],
    "gasPrice": "auto",
    "gasMultiplier": 1.1,
    "timeout": 600000,
    "verify": {
      "etherscan": {
        "apiKey": "${ETHERSCAN_API_KEY}"
      }
    },
    "explorer": {
      "name": "Etherscan",
      "url": "https://etherscan.io"
    }
  },
  "polygon": {
    "chainId": 137,
    "name": "Polygon Mainnet",
    "rpcUrl": "${POLYGON_RPC_URL}",
    "accounts": ["${PRIVATE_KEY}"],
    "gasPrice": "auto",
    "gasMultiplier": 1.2,
    "timeout": 300000,
    "verify": {
      "polygonscan": {
        "apiKey": "${POLYGONSCAN_API_KEY}"
      }
    },
    "explorer": {
      "name": "PolygonScan",
      "url": "https://polygonscan.com"
    }
  }
}
```

## 3. Scripts de Deploy

### 3.1 Migration Script
**Arquivo**: `deploy/migrate.js`

```javascript
const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Deploy CryptoDraw contracts with proper configuration
 */
async function main() {
    console.log('Starting CryptoDraw deployment...');
    
    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
    
    const network = await ethers.provider.getNetwork();
    console.log('Network:', network.name, 'ChainId:', network.chainId);
    
    // Load deployment configuration
    const config = loadNetworkConfig(network.chainId);
    const deployments = {};
    
    // 1. Deploy TicketNFT
    console.log('\n1. Deploying TicketNFT...');
    const TicketNFT = await ethers.getContractFactory('TicketNFT');
    const ticketNFT = await TicketNFT.deploy(
        config.ticketNFT.name,
        config.ticketNFT.symbol,
        config.ticketNFT.baseURI
    );
    await ticketNFT.waitForDeployment();
    deployments.ticketNFT = await ticketNFT.getAddress();
    console.log('TicketNFT deployed to:', deployments.ticketNFT);
    
    // 2. Deploy Price Oracle (or use existing Chainlink)
    console.log('\n2. Setting up Price Oracle...');
    if (config.oracle.useChainlink) {
        deployments.priceOracle = config.oracle.chainlinkAddress;
        console.log('Using Chainlink Oracle at:', deployments.priceOracle);
    } else {
        const PriceOracle = await ethers.getContractFactory('MockPriceOracle');
        const priceOracle = await PriceOracle.deploy(config.oracle.initialPrice);
        await priceOracle.waitForDeployment();
        deployments.priceOracle = await priceOracle.getAddress();
        console.log('Mock Price Oracle deployed to:', deployments.priceOracle);
    }
    
    // 3. Deploy Randomness Provider (or use existing VRF)
    console.log('\n3. Setting up Randomness Provider...');
    if (config.randomness.useVRF) {
        const RandomnessProvider = await ethers.getContractFactory('VRFRandomnessProvider');
        const randomnessProvider = await RandomnessProvider.deploy(
            config.randomness.vrfCoordinator,
            config.randomness.keyHash,
            config.randomness.subscriptionId
        );
        await randomnessProvider.waitForDeployment();
        deployments.randomnessProvider = await randomnessProvider.getAddress();
        console.log('VRF Randomness Provider deployed to:', deployments.randomnessProvider);
    } else {
        const RandomnessProvider = await ethers.getContractFactory('MockRandomnessProvider');
        const randomnessProvider = await RandomnessProvider.deploy();
        await randomnessProvider.waitForDeployment();
        deployments.randomnessProvider = await randomnessProvider.getAddress();
        console.log('Mock Randomness Provider deployed to:', deployments.randomnessProvider);
    }
    
    // 4. Deploy CryptoDraw (Main Contract)
    console.log('\n4. Deploying CryptoDraw...');
    const CryptoDraw = await ethers.getContractFactory('CryptoDraw');
    const cryptoDraw = await upgrades.deployProxy(CryptoDraw, [
        deployments.ticketNFT,
        deployments.priceOracle,
        deployments.randomnessProvider,
        config.cryptoDraw.admin
    ], {
        initializer: 'initialize',
        kind: 'uups'
    });
    await cryptoDraw.waitForDeployment();
    deployments.cryptoDraw = await cryptoDraw.getAddress();
    console.log('CryptoDraw deployed to:', deployments.cryptoDraw);
    
    // 5. Deploy Pool Manager
    console.log('\n5. Deploying Pool Manager...');
    const PoolManager = await ethers.getContractFactory('PoolManager');
    const poolManager = await PoolManager.deploy(deployments.cryptoDraw);
    await poolManager.waitForDeployment();
    deployments.poolManager = await poolManager.getAddress();
    console.log('Pool Manager deployed to:', deployments.poolManager);
    
    // 6. Configure contracts
    console.log('\n6. Configuring contracts...');
    
    // Set TicketNFT minter role
    const ticketContract = await ethers.getContractAt('TicketNFT', deployments.ticketNFT);
    await ticketContract.grantRole(
        await ticketContract.MINTER_ROLE(),
        deployments.cryptoDraw
    );
    console.log('Granted MINTER_ROLE to CryptoDraw');
    
    // Configure game parameters
    const cryptoDrawContract = await ethers.getContractAt('CryptoDraw', deployments.cryptoDraw);
    
    // Lotofácil configuration
    await cryptoDrawContract.setGameConfig(
        1, // LOTOFACIL
        config.games.lotofacil.ticketPrice,
        config.games.lotofacil.prizeDistribution
    );
    console.log('Configured Lotofácil game');
    
    // SuperSete configuration
    await cryptoDrawContract.setGameConfig(
        2, // SUPERSETE
        config.games.supersete.ticketPrice,
        config.games.supersete.prizeDistribution
    );
    console.log('Configured SuperSete game');
    
    // 7. Save deployment information
    const deploymentData = {
        network: network.name,
        chainId: Number(network.chainId),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployments,
        verified: false,
        configuration: config
    };
    
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(deploymentsDir, `${network.name}.json`),
        JSON.stringify(deploymentData, null, 2)
    );
    
    console.log('\n✅ Deployment completed successfully!');
    console.log('Deployment saved to:', path.join(deploymentsDir, `${network.name}.json`));
    
    // 8. Verification (if enabled)
    if (config.verify && network.name !== 'hardhat' && network.name !== 'localhost') {
        console.log('\n8. Verifying contracts on Etherscan...');
        await verifyContracts(deployments, config);
    }
    
    return deployments;
}

function loadNetworkConfig(chainId) {
    const configMap = {
        1337: require('./configs/localhost.json'),
        31337: require('./configs/hardhat.json'),
        5: require('./configs/goerli.json'),
        11155111: require('./configs/sepolia.json'),
        1: require('./configs/mainnet.json'),
        137: require('./configs/polygon.json')
    };
    
    const config = configMap[chainId];
    if (!config) {
        throw new Error(`No configuration found for chain ID: ${chainId}`);
    }
    
    return config;
}

async function verifyContracts(deployments, config) {
    const { run } = require('hardhat');
    
    try {
        // Verify TicketNFT
        await run('verify:verify', {
            address: deployments.ticketNFT,
            constructorArguments: [
                config.ticketNFT.name,
                config.ticketNFT.symbol,
                config.ticketNFT.baseURI
            ]
        });
        console.log('✅ TicketNFT verified');
        
        // Verify CryptoDraw implementation
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(deployments.cryptoDraw);
        await run('verify:verify', {
            address: implementationAddress,
            constructorArguments: []
        });
        console.log('✅ CryptoDraw implementation verified');
        
        // Verify Pool Manager
        await run('verify:verify', {
            address: deployments.poolManager,
            constructorArguments: [deployments.cryptoDraw]
        });
        console.log('✅ Pool Manager verified');
        
    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

// Run deployment
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

### 3.2 Verification Script
**Arquivo**: `deploy/verify.js`

```javascript
const { run } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Verify deployed contracts on Etherscan
 */
async function main() {
    const network = await ethers.provider.getNetwork();
    const deploymentFile = path.join(__dirname, `../deployments/${network.name}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log(`Verifying contracts on ${network.name}...`);
    
    try {
        // Verify TicketNFT
        console.log('Verifying TicketNFT...');
        await run('verify:verify', {
            address: deployment.contracts.ticketNFT,
            constructorArguments: [
                deployment.configuration.ticketNFT.name,
                deployment.configuration.ticketNFT.symbol,
                deployment.configuration.ticketNFT.baseURI
            ]
        });
        console.log('✅ TicketNFT verified');
        
        // Verify Price Oracle (if mock)
        if (!deployment.configuration.oracle.useChainlink) {
            console.log('Verifying Price Oracle...');
            await run('verify:verify', {
                address: deployment.contracts.priceOracle,
                constructorArguments: [deployment.configuration.oracle.initialPrice]
            });
            console.log('✅ Price Oracle verified');
        }
        
        // Verify Randomness Provider
        console.log('Verifying Randomness Provider...');
        if (deployment.configuration.randomness.useVRF) {
            await run('verify:verify', {
                address: deployment.contracts.randomnessProvider,
                constructorArguments: [
                    deployment.configuration.randomness.vrfCoordinator,
                    deployment.configuration.randomness.keyHash,
                    deployment.configuration.randomness.subscriptionId
                ]
            });
        } else {
            await run('verify:verify', {
                address: deployment.contracts.randomnessProvider,
                constructorArguments: []
            });
        }
        console.log('✅ Randomness Provider verified');
        
        // Verify CryptoDraw implementation
        console.log('Verifying CryptoDraw implementation...');
        const { upgrades } = require('hardhat');
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(
            deployment.contracts.cryptoDraw
        );
        await run('verify:verify', {
            address: implementationAddress,
            constructorArguments: []
        });
        console.log('✅ CryptoDraw implementation verified');
        
        // Verify Pool Manager
        console.log('Verifying Pool Manager...');
        await run('verify:verify', {
            address: deployment.contracts.poolManager,
            constructorArguments: [deployment.contracts.cryptoDraw]
        });
        console.log('✅ Pool Manager verified');
        
        // Update deployment file
        deployment.verified = true;
        deployment.verifiedAt = new Date().toISOString();
        
        fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
        
        console.log('\n✅ All contracts verified successfully!');
        
    } catch (error) {
        console.error('Verification failed:', error.message);
        throw error;
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

### 3.3 Setup Script
**Arquivo**: `deploy/setup.js`

```javascript
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Setup deployed contracts with initial configuration
 */
async function main() {
    const network = await ethers.provider.getNetwork();
    const deploymentFile = path.join(__dirname, `../deployments/${network.name}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const [admin] = await ethers.getSigners();
    
    console.log(`Setting up CryptoDraw contracts on ${network.name}...`);
    console.log('Admin account:', admin.address);
    
    // Get contract instances
    const cryptoDraw = await ethers.getContractAt('CryptoDraw', deployment.contracts.cryptoDraw);
    const ticketNFT = await ethers.getContractAt('TicketNFT', deployment.contracts.ticketNFT);
    const poolManager = await ethers.getContractAt('PoolManager', deployment.contracts.poolManager);
    
    // 1. Create initial draws
    console.log('\n1. Creating initial draws...');
    
    const now = Math.floor(Date.now() / 1000);
    const tomorrow = now + 86400; // 24 hours
    const nextWeek = now + 604800; // 7 days
    
    // Create Lotofácil draw
    const lotofacilTx = await cryptoDraw.createDraw(
        1, // LOTOFACIL
        tomorrow,
        { gasLimit: 500000 }
    );
    await lotofacilTx.wait();
    console.log('✅ Lotofácil draw created for tomorrow');
    
    // Create SuperSete draw  
    const superseteTx = await cryptoDraw.createDraw(
        2, // SUPERSETE
        nextWeek,
        { gasLimit: 500000 }
    );
    await superseteTx.wait();
    console.log('✅ SuperSete draw created for next week');
    
    // 2. Set up roles and permissions
    console.log('\n2. Setting up roles and permissions...');
    
    // Grant OPERATOR_ROLE to admin for administrative tasks
    const operatorRole = await cryptoDraw.OPERATOR_ROLE();
    if (!(await cryptoDraw.hasRole(operatorRole, admin.address))) {
        await cryptoDraw.grantRole(operatorRole, admin.address);
        console.log('✅ Granted OPERATOR_ROLE to admin');
    }
    
    // Grant DRAW_MANAGER_ROLE to admin for draw management
    const drawManagerRole = await cryptoDraw.DRAW_MANAGER_ROLE();
    if (!(await cryptoDraw.hasRole(drawManagerRole, admin.address))) {
        await cryptoDraw.grantRole(drawManagerRole, admin.address);
        console.log('✅ Granted DRAW_MANAGER_ROLE to admin');
    }
    
    // 3. Configure fee parameters (if not mainnet)
    if (network.chainId !== 1n) {
        console.log('\n3. Configuring fee parameters...');
        
        await cryptoDraw.setProtocolFee(250); // 2.5%
        console.log('✅ Set protocol fee to 2.5%');
        
        await cryptoDraw.setTreasuryAddress(admin.address);
        console.log('✅ Set treasury address');
    }
    
    // 4. Configure Pool Manager permissions
    console.log('\n4. Configuring Pool Manager...');
    
    // Grant POOL_CREATOR_ROLE to anyone (public pool creation)
    const poolCreatorRole = await poolManager.POOL_CREATOR_ROLE();
    const publicRole = ethers.ZeroHash; // PUBLIC_ROLE
    
    try {
        await poolManager.setRoleAdmin(poolCreatorRole, publicRole);
        console.log('✅ Configured public pool creation');
    } catch (error) {
        console.log('⚠️  Pool creation already configured');
    }
    
    // 5. Test basic functionality (testnet only)
    if (network.chainId !== 1n) {
        console.log('\n5. Testing basic functionality...');
        
        try {
            // Test price oracle
            const price = await cryptoDraw.getTokenPriceUSD();
            console.log(`✅ ETH price: $${ethers.formatUnits(price, 8)}`);
            
            // Test draw status
            const draw1 = await cryptoDraw.draws(1);
            console.log(`✅ Draw 1 status: ${draw1.status}`);
            
            console.log('✅ Basic functionality test passed');
            
        } catch (error) {
            console.log('⚠️  Basic functionality test failed:', error.message);
        }
    }
    
    // 6. Update deployment file with setup status
    deployment.setupCompleted = true;
    deployment.setupAt = new Date().toISOString();
    deployment.initialDraws = {
        lotofacil: 1,
        supersete: 2
    };
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    
    console.log('\n✅ Setup completed successfully!');
    console.log('Contracts are ready for use.');
    
    // Display important information
    console.log('\n📋 Important Information:');
    console.log('CryptoDraw:', deployment.contracts.cryptoDraw);
    console.log('TicketNFT:', deployment.contracts.ticketNFT);
    console.log('PoolManager:', deployment.contracts.poolManager);
    console.log('Admin:', admin.address);
    
    return deployment;
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

## 4. Templates de Secrets

### 4.1 Environment Variables Template
**Arquivo**: `secrets/.env.example`

```bash
# Environment Configuration
NODE_ENV=development
DEBUG=true

# Network Configuration
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ETHEREUM_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
GOERLI_RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Private Keys (NEVER commit real keys)
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
MNEMONIC="test test test test test test test test test test test junk"

# API Keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY
COINGECKO_API_KEY=YOUR_COINGECKO_API_KEY
ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
INFURA_API_KEY=YOUR_INFURA_API_KEY

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cryptodraw
DB_USER=cryptodraw_user
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://cryptodraw_user:your_secure_password@localhost:5432/cryptodraw

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://localhost:6379

# Application Configuration
PORT=3000
WS_PORT=3001
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Security
JWT_SECRET=your_very_secure_jwt_secret_key_here
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here

# Gas Configuration
GAS_PRICE=20000000000
MAX_FEE_PER_GAS=30000000000
MAX_PRIORITY_FEE_PER_GAS=2000000000

# Contract Addresses (filled after deployment)
CONTRACT_CRYPTO_DRAW=
CONTRACT_TICKET_NFT=
CONTRACT_POOL_MANAGER=
CONTRACT_PRICE_ORACLE=
CONTRACT_RANDOMNESS_PROVIDER=

# VRF Configuration (Chainlink VRF)
VRF_COORDINATOR=0x271682DEB8C4E0901D1a1550aD2e64D568E69909
VRF_KEY_HASH=0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef
VRF_SUBSCRIPTION_ID=1234

# Monitoring & Logging
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your_datadog_api_key
NEW_RELIC_LICENSE_KEY=your_newrelic_license_key

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS Configuration (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=cryptodraw-assets

# CDN Configuration
CDN_URL=https://cdn.cryptodraw.com
STATIC_URL=https://static.cryptodraw.com

# Feature Flags
ENABLE_POOLS=true
ENABLE_STATISTICS=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=false
ENABLE_MOCK_RANDOMNESS=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# Backup Configuration
BACKUP_S3_BUCKET=cryptodraw-backups
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
```

### 4.2 Secrets Template
**Arquivo**: `secrets/secrets.template.json`

```json
{
  "development": {
    "database": {
      "password": "dev_password_here",
      "ssl": false
    },
    "redis": {
      "password": null
    },
    "jwt": {
      "secret": "dev_jwt_secret_change_in_production"
    },
    "blockchain": {
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "infuraKey": "your_infura_key_here",
      "alchemyKey": "your_alchemy_key_here"
    },
    "apis": {
      "etherscan": "your_etherscan_api_key",
      "coingecko": "your_coingecko_api_key"
    }
  },
  "testing": {
    "database": {
      "password": "test_password",
      "ssl": false
    },
    "redis": {
      "password": null
    },
    "jwt": {
      "secret": "test_jwt_secret"
    },
    "blockchain": {
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    }
  },
  "staging": {
    "database": {
      "password": "STAGING_DB_PASSWORD",
      "ssl": {
        "rejectUnauthorized": false
      }
    },
    "redis": {
      "password": "STAGING_REDIS_PASSWORD"
    },
    "jwt": {
      "secret": "STAGING_JWT_SECRET"
    },
    "blockchain": {
      "privateKey": "STAGING_PRIVATE_KEY",
      "infuraKey": "STAGING_INFURA_KEY",
      "alchemyKey": "STAGING_ALCHEMY_KEY"
    },
    "apis": {
      "etherscan": "STAGING_ETHERSCAN_API_KEY",
      "coingecko": "STAGING_COINGECKO_API_KEY"
    },
    "monitoring": {
      "sentryDsn": "STAGING_SENTRY_DSN"
    }
  },
  "production": {
    "database": {
      "password": "PRODUCTION_DB_PASSWORD",
      "ssl": {
        "rejectUnauthorized": false,
        "ca": "PRODUCTION_DB_CA_CERT"
      }
    },
    "redis": {
      "password": "PRODUCTION_REDIS_PASSWORD",
      "tls": {
        "rejectUnauthorized": false
      }
    },
    "jwt": {
      "secret": "PRODUCTION_JWT_SECRET_VERY_SECURE"
    },
    "blockchain": {
      "privateKey": "PRODUCTION_PRIVATE_KEY",
      "infuraKey": "PRODUCTION_INFURA_KEY",
      "alchemyKey": "PRODUCTION_ALCHEMY_KEY"
    },
    "apis": {
      "etherscan": "PRODUCTION_ETHERSCAN_API_KEY",
      "coingecko": "PRODUCTION_COINGECKO_API_KEY"
    },
    "monitoring": {
      "sentryDsn": "PRODUCTION_SENTRY_DSN",
      "datadogApiKey": "PRODUCTION_DATADOG_API_KEY"
    },
    "aws": {
      "accessKeyId": "PRODUCTION_AWS_ACCESS_KEY_ID",
      "secretAccessKey": "PRODUCTION_AWS_SECRET_ACCESS_KEY",
      "region": "us-east-1"
    },
    "email": {
      "smtpPassword": "PRODUCTION_SMTP_PASSWORD"
    }
  }
}
```

## Checklist de Implementação das Configurações

### Configurações de Ambiente
- [ ] Development environment config
- [ ] Testing environment config
- [ ] Staging environment config
- [ ] Production environment config
- [ ] Feature flags configuration

### Configurações de Rede
- [ ] Networks configuration (localhost, testnet, mainnet)
- [ ] Contract addresses per network
- [ ] Gas configurations
- [ ] RPC endpoints configuration
- [ ] Explorer configurations

### Scripts de Deploy
- [ ] Migration script com deploy completo
- [ ] Verification script para Etherscan
- [ ] Setup script para configuração inicial
- [ ] Upgrade scripts para contratos upgradeáveis
- [ ] Rollback procedures

### Gestão de Secrets
- [ ] Environment variables template
- [ ] Secrets template file
- [ ] Key rotation procedures
- [ ] Security best practices documentation
- [ ] Backup procedures for sensitive data

### Validação e Testes
- [ ] Configuration validation
- [ ] Environment-specific tests
- [ ] Deploy script testing
- [ ] Smoke tests pós-deploy
- [ ] Monitoring setup validation