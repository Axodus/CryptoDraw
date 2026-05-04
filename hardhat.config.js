require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    mainnet: {
      url: "https://mainnet.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 1,
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 11155111,
    },
    harmony: {
      url: "https://api.harmony.one",
      chainId: 1666600000,
    },
    bsc: {
      url: "https://bsc-mainnet.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 56,
    },
    bsc_testnet: {
      url: "https://bsc-testnet.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 97,
    },
    opBNB: {
      url: "https://opbnb-testnet.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 100,
    },
    opBNB_testnet: {
      url: "https://opbnb-mainnet.infura.io/v3/554262fab79f49adb4fdba2db2587800",
      chainId: 101,
    }
  },
  // Uncomment and configure this section if you need Etherscan verification
  /* etherscan: {
    apiKey: {
      // Your etherscan API key if needed for verification
    }
  } */
};
