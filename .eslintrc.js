module.exports = {
  env: {
    node: true,
    es6: true,
    mocha: true, // Adiciona suporte para globals do Mocha (describe, it, beforeEach, etc.)
  },
  extends: [
    "eslint:recommended"
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  globals: {
    // Hardhat específicos
    ethers: "readonly",
    network: "readonly",
    artifacts: "readonly",
    web3: "readonly",
    
    // Chai específicos
    expect: "readonly",
    assert: "readonly",
    
    // Hardhat testing específicos
    deployments: "readonly",
    getNamedAccounts: "readonly",
    
    // Testing utilities
    time: "readonly",
    anyValue: "readonly"
  },
  rules: {
    // Relaxa algumas regras para ambiente de teste
    "no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-console": "warn",
    "no-debugger": "warn"
  },
  overrides: [
    {
      // Configuração específica para arquivos de teste
      files: ["test/**/*.js", "test/**/*.ts"],
      env: {
        mocha: true,
        node: true
      },
      globals: {
        expect: "readonly",
        assert: "readonly",
        ethers: "readonly",
        network: "readonly",
        deployments: "readonly",
        getNamedAccounts: "readonly",
        artifacts: "readonly",
        web3: "readonly",
        time: "readonly",
        anyValue: "readonly"
      },
      rules: {
        "no-unused-vars": "off", // Permite variáveis não utilizadas em testes
        "no-console": "off" // Permite console.log em testes
      }
    }
  ]
};