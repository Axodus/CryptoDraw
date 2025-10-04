require('@nomiclabs/hardhat-ethers');
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
      // viaIR desabilitado para testes para evitar warnings
    }
  },
  coverage: {
    skipFiles: ["contracts/mocks/", "test/v2/"],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000"
      }
    }
  },
  mocha: {
    timeout: 60000
  }
};