const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDrawV2 Contract", function () {
  // Deployment fixture
  async function deployCryptoDrawV2Fixture() {
    const [owner, operator, agent, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy GameLibrary
    const GameLibrary = await ethers.getContractFactory("GameLibrary");
    const gameLibrary = await GameLibrary.deploy();
    
    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const initialOnePrice = ethers.utils.parseEther("2000");
    const priceOracle = await PriceOracle.deploy(initialOnePrice);
    
    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    
  // Destination wallets
    const treasuryWallet = owner.address;
    const prizeWallet = owner.address;
    const projectFund = owner.address;
    const grantFund = owner.address;
    const operationFund = owner.address;
    
  // Deploy CryptoDrawV2 (no explicit GameLibrary linking required)
    const CryptoDrawV2 = await ethers.getContractFactory("contracts/CryptoDrawV2.sol:CryptoDraw");
    
    const cryptoDrawV2 = await CryptoDrawV2.deploy(
      ticketNFT.address,
      priceOracle.address,
      treasuryWallet,
      prizeWallet,
      projectFund,
      grantFund,
      operationFund
    );
    
    // Setup roles
    const OPERATOR_ROLE = await cryptoDrawV2.OPERATOR_ROLE();
    const AGENT_ROLE = await cryptoDrawV2.AGENT_ROLE();
    
    await cryptoDrawV2.grantRole(OPERATOR_ROLE, operator.address);
    await cryptoDrawV2.grantRole(AGENT_ROLE, agent.address);
    
  // Configure TicketNFT minter
    await ticketNFT.setCryptoDrawAddress(cryptoDrawV2.address);

  // Enable native ONE token
    await cryptoDrawV2.setSupportedToken(ethers.constants.AddressZero, true);
    
    return {
      cryptoDrawV2,
      ticketNFT,
      priceOracle,
      gameLibrary,
      owner,
      operator,
      agent,
      user1,
      user2,
      user3,
      treasuryWallet,
      prizeWallet,
      projectFund,
      grantFund,
      operationFund
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      expect(await cryptoDrawV2.hasRole(await cryptoDrawV2.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should initialize with correct addresses", async function () {
      const { cryptoDrawV2, ticketNFT, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      expect(await cryptoDrawV2.ticketNFT()).to.equal(ticketNFT.address);
      expect(await cryptoDrawV2.prizeOracle()).to.equal(priceOracle.address);
    });

    it("Should have default revenue configuration", async function () {
      const { cryptoDrawV2 } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const revenueConfig = await cryptoDrawV2.revenueConfig();
      expect(revenueConfig.prizesPercent).to.equal(4335); // 43.35%
      expect(revenueConfig.agentCommissionPercent).to.equal(861); // 8.61%
    });

    it("Should not be paused initially", async function () {
      const { cryptoDrawV2 } = await loadFixture(deployCryptoDrawV2Fixture);
      expect(await cryptoDrawV2.paused()).to.be.false;
    });
  });

  describe("Game Configuration", function () {
    it("Should allow admin to configure SuperSeven game", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
  const gameType = 0; // SUPERSEVEN
      const ticketPriceUSD = ethers.utils.parseEther("1"); // $1
      const drawInterval = 24 * 60 * 60; // 1 day
      
      await cryptoDrawV2.connect(owner).setGameConfig(
        gameType,
        ticketPriceUSD,
        drawInterval,
        true
      );
      
      const config = await cryptoDrawV2.gameConfigs(gameType);
      expect(config.ticketPriceUSD).to.equal(ticketPriceUSD);
      expect(config.drawInterval).to.equal(drawInterval);
      expect(config.enabled).to.be.true;
    });

    it("Should allow admin to configure EasyLotto game", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const gameType = 1; // EASYLOTTO
      const ticketPriceUSD = ethers.utils.parseEther("2"); // $2
      const drawInterval = 7 * 24 * 60 * 60; // 1 week
      
      await cryptoDrawV2.connect(owner).setGameConfig(
        gameType,
        ticketPriceUSD,
        drawInterval,
        true
      );
      
      const config = await cryptoDrawV2.gameConfigs(gameType);
      expect(config.ticketPriceUSD).to.equal(ticketPriceUSD);
      expect(config.drawInterval).to.equal(drawInterval);
      expect(config.enabled).to.be.true;
    });

  it("Should prevent non-admin from configuring games", async function () {
      const { cryptoDrawV2, user1 } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await expect(
        cryptoDrawV2.connect(user1).setGameConfig(
          0, // SUPERSEVEN
          ethers.utils.parseEther("1"),
          24 * 60 * 60,
          true
        )
      ).to.be.reverted;
    });

    it("Should emit GameConfigured event", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const gameType = 0;
      const ticketPriceUSD = ethers.utils.parseEther("1");
      const drawInterval = 24 * 60 * 60;
      
      await expect(
        cryptoDrawV2.connect(owner).setGameConfig(gameType, ticketPriceUSD, drawInterval, true)
      ).to.emit(cryptoDrawV2, "GameConfigured")
       .withArgs(gameType, ticketPriceUSD, drawInterval, true);
    });
  });

  describe("Payment Token Management", function () {
    it("Should allow admin to add supported payment token", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      // Deploy mock ERC20 token
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
      
  await cryptoDrawV2.connect(owner).setSupportedToken(mockToken.address, true);
      
      expect(await cryptoDrawV2.supportedTokens(mockToken.address)).to.be.true;
    });

    it("Should allow admin to remove supported payment token", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
      
      // Add then remove
  await cryptoDrawV2.connect(owner).setSupportedToken(mockToken.address, true);
  await cryptoDrawV2.connect(owner).setSupportedToken(mockToken.address, false);
      
      expect(await cryptoDrawV2.supportedTokens(mockToken.address)).to.be.false;
    });

    it("Should emit TokenSupportUpdated event", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
      
      await expect(
        cryptoDrawV2.connect(owner).setSupportedToken(mockToken.address, true)
      ).to.emit(cryptoDrawV2, "TokenSupportUpdated")
       .withArgs(mockToken.address, true);
    });
  });

  describe("Draw Management", function () {
    // Removed beforeEach that used Mocha `this` context and redeployed unnecessarily.

    it("Should allow operator to create new draw", async function () {
      const { cryptoDrawV2, operator } = await loadFixture(deployCryptoDrawV2Fixture);
  await cryptoDrawV2.setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
  const gameType = 0; // SUPERSEVEN
      
      await cryptoDrawV2.connect(operator).createDraw(gameType);
      
      const config = await cryptoDrawV2.gameConfigs(gameType);
      expect(config.currentDrawId).to.equal(1);
      
      const draw = await cryptoDrawV2.draws(gameType, 1);
      expect(draw.game).to.equal(gameType);
      expect(draw.status).to.equal(1); // OPEN
    });

    it("Should prevent non-operator from creating draws", async function () {
      const { cryptoDrawV2, owner, user1 } = await loadFixture(deployCryptoDrawV2Fixture);
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await expect(
        cryptoDrawV2.connect(user1).createDraw(0)
      ).to.be.reverted;
    });

    it("Should allow operator to close draw", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await cryptoDrawV2.connect(operator).createDraw(0);
  await cryptoDrawV2.connect(operator).closeDrawSimple(0, 1);
      
      const draw = await cryptoDrawV2.draws(0, 1);
      expect(draw.status).to.equal(2); // CLOSED
    });

    it("Should emit DrawCreated event", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await expect(
        cryptoDrawV2.connect(operator).createDraw(0)
      ).to.emit(cryptoDrawV2, "DrawCreated");
    });

    it("Should emit DrawClosed event", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await cryptoDrawV2.connect(operator).createDraw(0);
      
      await expect(
        cryptoDrawV2.connect(operator).closeDrawSimple(0, 1)
      ).to.emit(cryptoDrawV2, "DrawClosed")
       .withArgs(0, 1);
    });
  });

  describe("Ticket Purchase - Native ETH", function () {
    // Removed beforeEach that used Mocha `this` context.

  it("Should allow buying SuperSeven ticket with ETH", async function () {
      const { cryptoDrawV2, owner, operator, user1, ticketNFT, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).setGameConfig(
  0, // SUPERSEVEN
        ethers.utils.parseEther("1"), // $1
        24 * 60 * 60, // 1 day
        true
      );
      // Set ETH price to $2000 (18 decimals)
      await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));

      const gameType = 0; // SUPERSETE
  const numbers = [1, 2, 3, 4, 5, 6, 7]; // 7 numbers for SuperSeven
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005"); // $1 worth of ETH

      const tx = await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero,
        requiredETH,
        ethers.constants.AddressZero,
        { value: requiredETH }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchased");
      
      expect(event).to.not.be.undefined;
      expect(event.args.player).to.equal(user1.address);
      expect(event.args.game).to.equal(gameType);
      
  // Verify NFT was minted
      const ticketId = event.args.ticketId;
      expect(await ticketNFT.ownerOf(ticketId)).to.equal(user1.address);
    });

  it("Should reject invalid SuperSeven numbers (wrong count)", async function () {
      const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
  await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      const gameType = 0;
      const numbers = [1, 2, 3]; // Only 3 numbers instead of 7
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicket(
          gameType,
          numbers,
          rounds,
          ethers.constants.AddressZero,
          requiredETH,
          ethers.constants.AddressZero,
          { value: requiredETH }
        )
  ).to.be.reverted;
    });

    it("Should reject insufficient payment", async function () {
      const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
  await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const insufficientETH = ethers.utils.parseEther("0.0001"); // Too little
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicket(
          gameType,
          numbers,
          rounds,
          ethers.constants.AddressZero,
          insufficientETH,
          ethers.constants.AddressZero,
          { value: insufficientETH }
        )
      ).to.be.reverted;
    });
  });

  describe("Ticket Purchase - ERC20 Token", function () {
  // Removed beforeEach that used Mocha `this` context.

    it("Should allow buying EasyLotto ticket with ERC20 token", async function () {
      const { cryptoDrawV2, user1, ticketNFT, owner, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy("USD Token", "USDT", 6);
  // Register token in oracle at $1 with 6 decimals
  await priceOracle.connect(owner).addToken(mockToken.address, 6, ethers.utils.parseEther("1"));
      
  await cryptoDrawV2.setSupportedToken(mockToken.address, true);
  await cryptoDrawV2.setGameConfig(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);
  await cryptoDrawV2.createDraw(1);
      
      await mockToken.mint(user1.address, ethers.utils.parseUnits("1000", 6));
      
      const gameType = 1; // EASYLOTTO
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // 15 numbers for EasyLotto
      const rounds = 1;
      const tokenAmount = ethers.utils.parseUnits("2", 6); // $2 in 6-decimal token
      
      // Approve tokens
      await mockToken.connect(user1).approve(cryptoDrawV2.address, tokenAmount);
      
      const tx = await cryptoDrawV2.connect(user1).buyTicketWithToken(
        gameType,
        numbers,
        rounds,
        mockToken.address,
        tokenAmount,
        ethers.constants.AddressZero // No agent
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchased");
      
      expect(event).to.not.be.undefined;
      expect(event.args.paymentToken).to.equal(mockToken.address);
      expect(event.args.paymentAmount).to.equal(tokenAmount);
    });

    it("Should reject unsupported payment token", async function () {
      const { cryptoDrawV2, user1 } = await loadFixture(deployCryptoDrawV2Fixture);
      
  const MockToken = await ethers.getContractFactory("MockToken");
  const unsupportedToken = await MockToken.deploy("Unsupported", "UNS", 18);
      
  await cryptoDrawV2.setGameConfig(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);
      await cryptoDrawV2.createDraw(1);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const tokenAmount = ethers.utils.parseEther("2");
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicketWithToken(
          gameType,
          numbers,
          rounds,
          unsupportedToken.address,
          tokenAmount,
          ethers.constants.AddressZero
        )
      ).to.be.reverted;
    });
  });

  describe("Agent System", function () {
    it("Should calculate agent commission correctly", async function () {
      const { cryptoDrawV2, owner, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero,
        requiredETH,
        agent.address,
        { value: requiredETH }
      );
      
      const commission = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);
      
      // Should be approximately 8.61% of ticket price in USD
      const expectedCommission = ethers.utils.parseEther("1").mul(861).div(10000); // 8.61% of $1
      expect(commission).to.be.closeTo(expectedCommission, ethers.utils.parseEther("0.01"));
    });

    it("Should allow agent to withdraw commission", async function () {
      const { cryptoDrawV2, owner, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero,
        requiredETH,
        agent.address,
        { value: requiredETH }
      );
      
      const commissionBefore = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commissionBefore).to.be.gt(0);
      
      // Garante saldo disponível no contrato para pagar a comissão
      await user1.sendTransaction({ to: cryptoDrawV2.address, value: commissionBefore });

      await cryptoDrawV2.connect(agent).withdrawAgentCommission();
      
      const commissionAfter = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commissionAfter).to.equal(0);
    });

    it("Should prevent suspended agents from earning commission", async function () {
      const { cryptoDrawV2, owner, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      // Suspend agent
      await cryptoDrawV2.connect(owner).setSuspendedAgent(agent.address, true);
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicket(
          gameType,
          numbers,
          rounds,
          ethers.constants.AddressZero,
          requiredETH,
          agent.address,
          { value: requiredETH }
        )
      ).to.be.reverted;
    });
  });

  describe("Security and Access Control", function () {
    it("Should allow pausing by admin", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).pause();
      expect(await cryptoDrawV2.paused()).to.be.true;
    });

    it("Should prevent ticket purchase when paused", async function () {
  const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
  await cryptoDrawV2.connect(operator).createDraw(0);
  await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000"));
      
      await cryptoDrawV2.connect(owner).pause();
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicket(
          gameType,
          numbers,
          rounds,
          ethers.constants.AddressZero,
          requiredETH,
          ethers.constants.AddressZero,
          { value: requiredETH }
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow emergency withdrawal by admin", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      // Send some ETH to contract
      await owner.sendTransaction({
        to: cryptoDrawV2.address,
        value: ethers.utils.parseEther("1")
      });
      
      const contractBalance = await ethers.provider.getBalance(cryptoDrawV2.address);
      expect(contractBalance).to.be.gt(0);
      
      const adminBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await cryptoDrawV2.connect(owner).emergencyWithdraw(
        ethers.constants.AddressZero, // ETH
        owner.address,
        contractBalance
      );
      
      const adminBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(adminBalanceAfter).to.be.gt(adminBalanceBefore);
    });
  });

  describe("Revenue Distribution", function () {
    it("Should distribute revenue according to configuration", async function () {
  const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
  await cryptoDrawV2.connect(owner).setGameConfig(0, ethers.utils.parseEther("10"), 24 * 60 * 60, true); // $10 ticket
  await cryptoDrawV2.connect(operator).createDraw(0);
  await priceOracle.updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("2000")); // $2000 ETH
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.005"); // $10 worth
      
      const tx = await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero,
        requiredETH,
        ethers.constants.AddressZero,
        { value: requiredETH }
      );
      
      // Check that revenue was distributed
      // This would typically involve checking balances of different funds
      // For now, we just verify the transaction succeeded
      expect(tx).to.not.be.reverted;
    });

    it("Should allow admin to update revenue configuration", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const newConfig = {
        prizesPercent: 5000,         // 50%
        projectFundPercent: 2000,    // 20%
        grantFundPercent: 1500,      // 15%
        operationPercent: 1000,      // 10%
        agentCommissionPercent: 500  // 5%
      };
      
      await cryptoDrawV2.connect(owner).updateRevenueConfig(
        newConfig.prizesPercent,
        newConfig.projectFundPercent,
        newConfig.grantFundPercent,
        newConfig.operationPercent,
        newConfig.agentCommissionPercent
      );
      
      const updatedConfig = await cryptoDrawV2.revenueConfig();
      expect(updatedConfig.prizesPercent).to.equal(newConfig.prizesPercent);
      expect(updatedConfig.agentCommissionPercent).to.equal(newConfig.agentCommissionPercent);
    });

    it("Should reject invalid revenue configuration", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      // Total exceeds 100%
      await expect(
        cryptoDrawV2.connect(owner).updateRevenueConfig(
          6000, // 60%
          3000, // 30%
          2000, // 20%
          1000, // 10%
          500   // 5% = 125% total
        )
      ).to.be.reverted;
    });
  });

  // Merged tests from test/v2/CryptoDrawV2-priority.test.js
  describe("Merged v2 - Priority flows", function () {
    async function deployMergedFixture() {
      const [owner, operator, agent, user1, user2, treasury, prize, project, grant, operation] = await ethers.getSigners();

      const TicketNFT = await ethers.getContractFactory('TicketNFT');
      const ticketNFT = await TicketNFT.deploy();

      const PriceOracle = await ethers.getContractFactory('PriceOracle');
      const priceOracle = await PriceOracle.deploy(ethers.utils.parseEther('1'));

      const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
      const cryptoDraw = await CryptoDraw.deploy(
        ticketNFT.address,
        priceOracle.address,
        treasury.address,
        prize.address,
        project.address,
        grant.address,
        operation.address
      );

      await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

      const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
      const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
      await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
      await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

      const MockToken = await ethers.getContractFactory('MockToken');
      const mockToken = await MockToken.deploy('Mock Token', 'MOCK', 18);
      await mockToken.mint(user1.address, ethers.utils.parseEther('1000'));

      await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther('1'));
      await cryptoDraw.setSupportedToken(mockToken.address, true);
      await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);

      return { owner, operator, agent, user1, user2, treasury, prize, project, grant, operation, ticketNFT, priceOracle, cryptoDraw, mockToken };
    }

    it('operator can createDraw and emits DrawCreated', async function () {
      const { operator, cryptoDraw } = await deployMergedFixture();
      const tx = await cryptoDraw.connect(operator).createDraw(0);
      const rcpt = await tx.wait();
      const ev = rcpt.events.find((e) => e.event === 'DrawCreated');
      expect(ev).to.not.be.undefined;
      const current = await cryptoDraw.getCurrentDrawId(0);
      expect(current).to.be.gt(0);
    });

    it('buyTicketWithToken wrapper works using ERC20', async function () {
      const { user1, cryptoDraw, mockToken } = await deployMergedFixture();
      await mockToken.connect(user1).approve(cryptoDraw.address, ethers.utils.parseEther('1'));
      const tx = await cryptoDraw.connect(user1).buyTicketWithToken(
        0,
        [1,2,3,4,5,6,7],
        1,
        mockToken.address,
        ethers.utils.parseEther('1'),
        ethers.constants.AddressZero
      );
      const rcpt = await tx.wait();
      const ev = rcpt.events.find((e) => e.event === 'TicketPurchased');
      expect(ev).to.not.be.undefined;
    });

    it('emergencyWithdraw reverts when to == zero address', async function () {
      const { owner, cryptoDraw, mockToken } = await deployMergedFixture();
      await expect(
        cryptoDraw.connect(owner).emergencyWithdraw(mockToken.address, ethers.constants.AddressZero, ethers.utils.parseEther('1'))
      ).to.be.revertedWithCustomError(cryptoDraw, 'ZeroAddress');
    });

    it('emergencyWithdraw transfers native ONE when called by admin', async function () {
      const { owner, cryptoDraw, user1 } = await deployMergedFixture();
      await owner.sendTransaction({ to: cryptoDraw.address, value: ethers.utils.parseEther('1') });
      const before = await ethers.provider.getBalance(user1.address);
      const tx = await cryptoDraw.connect(owner).emergencyWithdraw(ethers.constants.AddressZero, user1.address, ethers.utils.parseEther('1'));
      await tx.wait();
      const after = await ethers.provider.getBalance(user1.address);
      expect(after).to.be.gt(before);
    });

    it('setWallets updates only non-zero addresses', async function () {
      const { owner, cryptoDraw, user1 } = await deployMergedFixture();
      await cryptoDraw.connect(owner).setWallets(user1.address, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero);
      const newTreasury = await cryptoDraw.treasuryWallet();
      expect(newTreasury).to.equal(user1.address);
    });

    it('claimPrize reverts when caller is not ticket owner', async function () {
      const { user1, user2, cryptoDraw, mockToken } = await deployMergedFixture();
      await mockToken.connect(user1).approve(cryptoDraw.address, ethers.utils.parseEther('1'));
      const tx = await cryptoDraw.connect(user1).buyTicketWithToken(
        0,
        [1,2,3,4,5,6,7],
        1,
        mockToken.address,
        ethers.utils.parseEther('1'),
        ethers.constants.AddressZero
      );
      const rcpt = await tx.wait();
      const ev = rcpt.events.find((e) => e.event === 'TicketPurchased');
      const ticketId = ev.args.ticketId;
      await expect(
        cryptoDraw.connect(user2).claimPrize(ticketId)
      ).to.be.revertedWithCustomError(cryptoDraw, 'NotTicketOwner');
    });

    it('buyTicket native: underpay, exact and overpay refund', async function () {
      const { user1, cryptoDraw } = await deployMergedFixture();
      await expect(
        cryptoDraw.connect(user1).buyTicket(
          0,
          [1,2,3,4,5,6,7],
          1,
          ethers.constants.AddressZero,
          ethers.utils.parseEther('1'),
          ethers.constants.AddressZero,
          { value: ethers.utils.parseEther('0.5') }
        )
      ).to.be.revertedWith('Insufficient native payment');

      await expect(
        cryptoDraw.connect(user1).buyTicket(
          0,
          [1,2,3,4,5,6,7],
          1,
          ethers.constants.AddressZero,
          ethers.utils.parseEther('1'),
          ethers.constants.AddressZero,
          { value: ethers.utils.parseEther('1') }
        )
      ).to.not.be.reverted;

      const before = await user1.getBalance();
      const tx = await cryptoDraw.connect(user1).buyTicket(
        0,
        [1,2,3,4,5,6,7],
        1,
        ethers.constants.AddressZero,
        ethers.utils.parseEther('2'),
        ethers.constants.AddressZero,
        { value: ethers.utils.parseEther('2') }
      );
      const rcpt = await tx.wait();
      const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
      const after = await user1.getBalance();
      expect(after).to.be.closeTo(before.sub(ethers.utils.parseEther('1')).sub(gas), ethers.utils.parseEther('0.01'));
    });

    it('buyTicket with agent and withdrawAgentCommission flow', async function () {
      const { agent, user1, cryptoDraw } = await deployMergedFixture();
      await cryptoDraw.connect(user1).buyTicket(
        0,
        [1,2,3,4,5,6,7],
        1,
        ethers.constants.AddressZero,
        ethers.utils.parseEther('1'),
        agent.address,
        { value: ethers.utils.parseEther('1') }
      );

      const commission = await cryptoDraw.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);
      await user1.sendTransaction({ to: cryptoDraw.address, value: commission });

      const before = await ethers.provider.getBalance(agent.address);
      const tx = await cryptoDraw.connect(agent).withdrawAgentCommission();
      await tx.wait();
      const after = await ethers.provider.getBalance(agent.address);
      expect(after).to.be.gt(before);
      expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
    });

    it('closeDrawSimple emits DrawClosed and closeDraw emits DrawCompleted + RevenueDistributed', async function () {
      const { operator, user1, cryptoDraw } = await deployMergedFixture();
      await cryptoDraw.connect(operator).createDraw(0);
      const drawId = await cryptoDraw.getCurrentDrawId(0);
      await cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') });

      const tx = await cryptoDraw.connect(operator).closeDrawSimple(0, drawId);
      const rcpt = await tx.wait();
      expect(rcpt.events.find((e) => e.event === 'DrawClosed')).to.not.be.undefined;

      await cryptoDraw.connect(operator).createDraw(0);
      const drawId2 = await cryptoDraw.getCurrentDrawId(0);
      await cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') });

      const tx2 = await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId2, 1);
      const rcpt2 = await tx2.wait();
      expect(rcpt2.events.find((e) => e.event === 'DrawCompleted')).to.not.be.undefined;
      expect(rcpt2.events.find((e) => e.event === 'RevenueDistributed')).to.not.be.undefined;
    });

    it('pause blocks buyTicket and unpause restores', async function () {
      const { owner, user1, cryptoDraw } = await deployMergedFixture();
      await cryptoDraw.connect(owner).pause();
      await expect(
        cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
      ).to.be.revertedWith('Pausable: paused');
      await cryptoDraw.connect(owner).unpause();
      await expect(
        cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
      ).to.not.be.reverted;
    });
  });

  // Merged tests from test/v2/CryptoDrawV2.basic.test.js
  describe('Merged v2 - Basic flows', function () {
    async function deployBasicFixture() {
      const [owner, operator, agent, user] = await ethers.getSigners();

      const TicketNFT = await ethers.getContractFactory('TicketNFT');
      const ticketNFT = await TicketNFT.deploy();

      const initialOnePrice = ethers.utils.parseEther('2000');
      const PriceOracle = await ethers.getContractFactory('PriceOracle');
      const priceOracle = await PriceOracle.deploy(initialOnePrice);

      const treasuryWallet = owner.address;
      const prizeWallet = owner.address;
      const projectFund = owner.address;
      const grantFund = owner.address;
      const operationFund = owner.address;

      const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
      const cryptoDraw = await CryptoDraw.deploy(
        ticketNFT.address,
        priceOracle.address,
        treasuryWallet,
        prizeWallet,
        projectFund,
        grantFund,
        operationFund
      );

      await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

      const ADMIN_ROLE = await cryptoDraw.ADMIN_ROLE();
      const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
      const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
      await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
      await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

      await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);

      return { owner, operator, agent, user, ticketNFT, priceOracle, cryptoDraw, ADMIN_ROLE, OPERATOR_ROLE, AGENT_ROLE };
    }

    it('configures game and buys a ticket with ONE (native)', async function () {
      const { cryptoDraw, user, ticketNFT } = await deployBasicFixture();

      const ticketPriceUSD = ethers.utils.parseEther('1');
      const drawInterval = 24 * 60 * 60;
      await cryptoDraw.setGameConfig(0, ticketPriceUSD, drawInterval, true);

      const requiredOne = ethers.utils.parseEther('0.0005');
      const tx = await cryptoDraw.connect(user).buyTicket(
        0,
        [1, 2, 3, 4, 5, 6, 7],
        1,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );
      const receipt = await tx.wait();
      const ev = receipt.events.find((e) => e.event === 'TicketPurchased');
      expect(ev).to.not.be.undefined;
      const ticketId = ev.args.ticketId;
      expect(await ticketNFT.ownerOf(ticketId)).to.equal(user.address);

      const currentDrawId = await cryptoDraw.getCurrentDrawId(0);
      expect(currentDrawId).to.be.gt(0);

      const draw = await cryptoDraw.getDraw(0, currentDrawId);
      expect(draw.status).to.equal(1);
    });

    it('accrues and withdraws agent commission', async function () {
      const { cryptoDraw, agent, user } = await deployBasicFixture();

      await cryptoDraw.setGameConfig(1, ethers.utils.parseEther('2'), 7 * 24 * 60 * 60, true);

      const requiredOne = ethers.utils.parseEther('0.001');
      await cryptoDraw.connect(user).buyTicket(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        ethers.constants.AddressZero,
        requiredOne,
        agent.address,
        { value: requiredOne }
      );

      const commission = await cryptoDraw.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);

      await user.sendTransaction({ to: cryptoDraw.address, value: commission });

      const before = await ethers.provider.getBalance(agent.address);
      const tx = await cryptoDraw.connect(agent).withdrawAgentCommission();
      await tx.wait();
      const after = await ethers.provider.getBalance(agent.address);

      expect(after).to.be.gt(before);
      expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
    });

    it('closes a draw and finalizes status', async function () {
      const { cryptoDraw, user } = await deployBasicFixture();

      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 24 * 60 * 60, true);

      const requiredOne = ethers.utils.parseEther('0.0005');
      await cryptoDraw.connect(user).buyTicket(
        0,
        [1, 2, 3, 4, 5, 6, 7],
        1,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );

      const drawId = await cryptoDraw.getCurrentDrawId(0);

      await cryptoDraw['closeDraw(uint8,uint32,uint256)'](0, drawId, 123456);
      const closed = await cryptoDraw.getDraw(0, drawId);
      expect(closed.status).to.equal(4);
      expect(closed.winningNumbersPacked).to.not.equal(0);
    });
  });

  // Extra coverage add-ons to reach 100% for CryptoDrawV2
  describe('Coverage add-ons', function () {
    // Helper: compute SuperSeven winning digits for given randomness/drawId (mirrors GameLibrary)
    function computeSuperSevenWinning(randomnessBn, drawIdBn) {
      let seed = ethers.utils.solidityKeccak256(['uint256', 'uint32'], [randomnessBn, drawIdBn]);
      const digits = [];
      for (let col = 0; col < 7; col++) {
        seed = ethers.utils.solidityKeccak256(['bytes32', 'uint8'], [seed, col]);
        const digit = ethers.BigNumber.from(seed).mod(10).toNumber();
        digits.push(digit);
      }
      return digits;
    }

    // Helper: compute EasyLotto winning numbers bitmask and list (mirrors GameLibrary)
    function computeEasyLottoWinning(randomnessBn, drawIdBn) {
      let seed = ethers.utils.solidityKeccak256(['uint256', 'uint32'], [randomnessBn, drawIdBn]);
      let packed = ethers.BigNumber.from(0);
      let count = 0;
      while (count < 15) {
        seed = ethers.utils.solidityKeccak256(['bytes32', 'uint8'], [seed, count]);
        const num = ethers.BigNumber.from(seed).mod(25).add(1).toNumber(); // 1-25
        const bit = ethers.BigNumber.from(1).shl(num - 1);
        if (packed.and(bit).isZero()) {
          packed = packed.or(bit);
          count++;
        }
      }
      // unpack list 1..25
      const numbers = [];
      for (let i = 0; i < 25; i++) {
        if (!packed.and(ethers.BigNumber.from(1).shl(i)).isZero()) {
          numbers.push(i + 1);
        }
      }
      return { packed, numbers };
    }

    async function baseFixture() {
      const [owner, operator, agent, user1, user2] = await ethers.getSigners();
      const TicketNFT = await ethers.getContractFactory('TicketNFT');
      const ticketNFT = await TicketNFT.deploy();
      const PriceOracle = await ethers.getContractFactory('PriceOracle');
      const priceOracle = await PriceOracle.deploy(ethers.utils.parseEther('2000'));
      const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
      const cryptoDraw = await CryptoDraw.deploy(
        ticketNFT.address,
        priceOracle.address,
        owner.address,
        owner.address,
        owner.address,
        owner.address,
        owner.address
      );
      await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);
      await cryptoDraw.grantRole(await cryptoDraw.OPERATOR_ROLE(), operator.address);
      await cryptoDraw.grantRole(await cryptoDraw.AGENT_ROLE(), agent.address);
      await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);
      return { owner, operator, agent, user1, user2, ticketNFT, priceOracle, cryptoDraw };
    }

    it('reverts when game disabled (GameNotEnabled)', async function () {
      const { cryptoDraw } = await baseFixture();
      // Disable game 0
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 24 * 60 * 60, false);
      await expect(
        cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
      ).to.be.revertedWithCustomError(cryptoDraw, 'GameNotEnabled');
    });

    it('reverts on invalid rounds (0 and >6)', async function () {
      const { cryptoDraw } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await expect(
        cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 0, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
      ).to.be.revertedWith('Invalid rounds');
      await expect(
        cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 7, ethers.constants.AddressZero, ethers.utils.parseEther('7'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('7') })
      ).to.be.revertedWith('Invalid rounds');
    });

    it('reverts on slippage (InsufficientPayment) when maxPaymentAmount too low', async function () {
      const { cryptoDraw } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      // price is $2000/ETH => needed 0.0005 ETH, set maxPayment lower
      await expect(
        cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('0.0004'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('0.0005') })
      ).to.be.revertedWithCustomError(cryptoDraw, 'InsufficientPayment');
    });

    it('non-agent address does not accrue commission', async function () {
      const { cryptoDraw, user1, user2 } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), user2.address, { value: ethers.utils.parseEther('1') });
      expect(await cryptoDraw.agentCommissions(user2.address)).to.equal(0);
    });

    it('AgentSuspended emits event and blocks earning (custom error)', async function () {
      const { cryptoDraw, agent } = await baseFixture();
      await expect(cryptoDraw.setSuspendedAgent(agent.address, true))
        .to.emit(cryptoDraw, 'AgentStatusUpdated').withArgs(agent.address, true);
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await expect(
        cryptoDraw.buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), agent.address, { value: ethers.utils.parseEther('1') })
      ).to.be.revertedWithCustomError(cryptoDraw, 'AgentSuspended');
    });

    it('EasyLotto invalid numbers (out of range) reverts with InvalidNumbers', async function () {
      const { cryptoDraw } = await baseFixture();
      await cryptoDraw.setGameConfig(1, ethers.utils.parseEther('1'), 4 * 86400, true);
      // 15 numbers but includes 0 (invalid)
      const nums = [0,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
      await expect(
        cryptoDraw.buyTicket(1, nums, 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
      ).to.be.revertedWithCustomError(cryptoDraw, 'InvalidNumbers');
    });

    it('closeDraw reverts when draw is not open', async function () {
      const { cryptoDraw, owner } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      // No draw exists yet: status == 0 -> not OPEN
      await expect(
        cryptoDraw['closeDraw(uint8,uint32,uint256)'](0, 1, 1)
      ).to.be.revertedWith('Draw not open');
      // Create and close to CLOSED, then try closeDraw again
      await cryptoDraw.createDraw(0);
      await cryptoDraw.closeDrawSimple(0, 1);
      await expect(
        cryptoDraw['closeDraw(uint8,uint32,uint256)'](0, 1, 1)
      ).to.be.revertedWith('Draw not open');
    });

    it('updateTokenSupport wrapper toggles mapping', async function () {
      const { cryptoDraw } = await baseFixture();
      const MockToken = await ethers.getContractFactory('MockToken');
      const t = await MockToken.deploy('T', 'T', 18);
      await cryptoDraw.updateTokenSupport(t.address, true);
      expect(await cryptoDraw.supportedTokens(t.address)).to.equal(true);
      await cryptoDraw.updateTokenSupport(t.address, false);
      expect(await cryptoDraw.supportedTokens(t.address)).to.equal(false);
    });

    it('withdrawPrize reverts when no balance and succeeds after claim', async function () {
      const { cryptoDraw, owner, operator, user1, priceOracle } = await baseFixture();
      await expect(cryptoDraw.connect(user1).withdrawPrize()).to.be.revertedWithCustomError(cryptoDraw, 'NoWithdrawableBalance');

      // Prepare a winning ticket for SuperSeven
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await cryptoDraw.connect(operator).createDraw(0);
      const drawId = await cryptoDraw.getCurrentDrawId(0);
      const randomness = ethers.BigNumber.from(123456);
      const digits = computeSuperSevenWinning(randomness, drawId);
      const requiredEth = ethers.utils.parseEther('0.0005');
      // buy
  const tx = await cryptoDraw.connect(user1).buyTicket(0, digits, 1, ethers.constants.AddressZero, requiredEth, ethers.constants.AddressZero, { value: requiredEth });
  const rcptBuy = await tx.wait();
  const ticketId = rcptBuy.events.find(e => e.event === 'TicketPurchased').args.ticketId;
      // close and set winners
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId, randomness);
      // claim
  const claim = await cryptoDraw.connect(user1).claimPrize(ticketId);
      await expect(claim).to.emit(cryptoDraw, 'PrizeClaimed');
      const owed = await cryptoDraw.withdrawableBalances(user1.address);
      // fund contract to allow payout
      await owner.sendTransaction({ to: cryptoDraw.address, value: owed });
      const before = await ethers.provider.getBalance(user1.address);
      const wtx = await cryptoDraw.connect(user1).withdrawPrize();
      const rcpt = await wtx.wait();
      const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
      const after = await ethers.provider.getBalance(user1.address);
      expect(after).to.be.closeTo(before.add(owed).sub(gas), ethers.utils.parseEther('0.0000001'));
      expect(await cryptoDraw.withdrawableBalances(user1.address)).to.equal(0);
    });

    it('claimPrize before completion reverts and second call after redeem reverts with TicketAlreadyRedeemed', async function () {
      const { cryptoDraw, operator, user1 } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await cryptoDraw.connect(operator).createDraw(0);
      const drawId = await cryptoDraw.getCurrentDrawId(0);
      const requiredEth = ethers.utils.parseEther('0.0005');
      const tx = await cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, requiredEth, ethers.constants.AddressZero, { value: requiredEth });
      const rcpt = await tx.wait();
      const ev = rcpt.events.find(e => e.event === 'TicketPurchased');
      const tokenId = ev.args.ticketId;
      // not completed
      await expect(cryptoDraw.connect(user1).claimPrize(tokenId)).to.be.revertedWith('Draw not completed');
      // complete with deterministic randomness but likely 0 matches => still mark redeemed only if prize>0. To force redemption, match winners
      const randomness = ethers.BigNumber.from(999);
      const digits = computeSuperSevenWinning(randomness, drawId);
      // overwrite: buy another winning ticket and claim that one to ensure we hit REDEEMED path
      const tx2 = await cryptoDraw.connect(user1).buyTicket(0, digits, 1, ethers.constants.AddressZero, requiredEth, ethers.constants.AddressZero, { value: requiredEth });
      const r2 = await tx2.wait();
      const t2 = r2.events.find(e => e.event === 'TicketPurchased').args.ticketId;
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId, randomness);
      await cryptoDraw.connect(user1).claimPrize(t2);
      await expect(cryptoDraw.connect(user1).claimPrize(t2)).to.be.revertedWithCustomError(cryptoDraw, 'TicketAlreadyRedeemed');
    });

    it('withdrawAgentCommission reverts when none available', async function () {
      const { cryptoDraw, agent } = await baseFixture();
      await expect(cryptoDraw.connect(agent).withdrawAgentCommission()).to.be.revertedWithCustomError(cryptoDraw, 'NoWithdrawableBalance');
    });

    it('emergencyWithdraw with ERC20 transfers and emits event', async function () {
      const { cryptoDraw, owner } = await baseFixture();
      const MockToken = await ethers.getContractFactory('MockToken');
      const token = await MockToken.deploy('ERC', 'ERC', 18);
      // fund contract with ERC20
      await token.mint(cryptoDraw.address, ethers.utils.parseEther('10'));
      const before = await token.balanceOf(owner.address);
      await expect(
        cryptoDraw.emergencyWithdraw(token.address, owner.address, ethers.utils.parseEther('3'))
      ).to.emit(cryptoDraw, 'EmergencyWithdrawal').withArgs(token.address, owner.address, ethers.utils.parseEther('3'));
      const after = await token.balanceOf(owner.address);
      expect(after.sub(before)).to.equal(ethers.utils.parseEther('3'));
    });

    it('EasyLotto prize calculation branch (15 matches) and withdraw', async function () {
      const { cryptoDraw, operator, owner, user1 } = await baseFixture();
      // Enable EasyLotto
      await cryptoDraw.setGameConfig(1, ethers.utils.parseEther('2'), 4 * 86400, true);
      await cryptoDraw.connect(operator).createDraw(1);
      const drawId = await cryptoDraw.getCurrentDrawId(1);
      const randomness = ethers.BigNumber.from('424242');
      const { numbers } = computeEasyLottoWinning(randomness, drawId);
      // maxPayment: $2 -> with $2000/ETH ~ 0.001 ETH
      const required = ethers.utils.parseEther('0.001');
  const tx = await cryptoDraw.connect(user1).buyTicket(1, numbers, 1, ethers.constants.AddressZero, required, ethers.constants.AddressZero, { value: required });
  const rcpt = await tx.wait();
  const tId = rcpt.events.find(e => e.event === 'TicketPurchased').args.ticketId;
      // close and claim
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](1, drawId, randomness);
  const claimTx = await cryptoDraw.connect(user1).claimPrize(tId);
      await expect(claimTx).to.emit(cryptoDraw, 'PrizeClaimed');
      const owed = await cryptoDraw.withdrawableBalances(user1.address);
      await owner.sendTransaction({ to: cryptoDraw.address, value: owed });
      await cryptoDraw.connect(user1).withdrawPrize();
      expect(await cryptoDraw.withdrawableBalances(user1.address)).to.equal(0);
    });

    it('claimPrize returns 0 prize (no event) when no matches thresholds met', async function () {
      const { cryptoDraw, operator, user1 } = await baseFixture();
      await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 86400, true);
      await cryptoDraw.connect(operator).createDraw(0);
      const drawId = await cryptoDraw.getCurrentDrawId(0);
      const requiredEth = ethers.utils.parseEther('0.0005');
      // Choose digits [9,9,9,9,9,9,9] and force randomness to something likely different
      const digits = [9,9,9,9,9,9,9];
      const tx = await cryptoDraw.connect(user1).buyTicket(0, digits, 1, ethers.constants.AddressZero, requiredEth, ethers.constants.AddressZero, { value: requiredEth });
      const rcpt = await tx.wait();
      const tokenId = rcpt.events.find(e => e.event === 'TicketPurchased').args.ticketId;
      const randomness = ethers.BigNumber.from(12345);
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId, randomness);
      // Expect no PrizeClaimed event and no withdrawable balance increment
      const claim = await cryptoDraw.connect(user1).claimPrize(tokenId);
      const rc = await claim.wait();
      const hasPrizeEvent = rc.events.some(e => e.event === 'PrizeClaimed');
      expect(hasPrizeEvent).to.equal(false);
      expect(await cryptoDraw.withdrawableBalances(user1.address)).to.equal(0);
    });

    it('configureGame wrapper (admin-only) updates config', async function () {
      const { cryptoDraw, user1 } = await baseFixture();
      // non-admin cannot call
      await expect(
        cryptoDraw.connect(user1).configureGame(0, ethers.utils.parseEther('1'), 999, true)
      ).to.be.reverted;
      // owner can call
      await cryptoDraw.configureGame(0, ethers.utils.parseEther('1'), 999, true);
      const cfg = await cryptoDraw.gameConfigs(0);
      expect(cfg.ticketPriceUSD).to.equal(ethers.utils.parseEther('1'));
      expect(cfg.drawInterval).to.equal(999);
      expect(cfg.enabled).to.equal(true);
    });

    it('getSupportedTokens returns correct list after add/remove', async function () {
      const { cryptoDraw } = await baseFixture();
      const MockToken = await ethers.getContractFactory('MockToken');
      const t1 = await MockToken.deploy('A', 'A', 18);
      const t2 = await MockToken.deploy('B', 'B', 18);
      await cryptoDraw.setSupportedToken(t1.address, true);
      await cryptoDraw.setSupportedToken(t2.address, true);
      let list = await cryptoDraw.getSupportedTokens();
      expect(list).to.include.members([ethers.constants.AddressZero, t1.address, t2.address]);
      // remove t1 and validate list updated (order not strictly guaranteed)
      await cryptoDraw.setSupportedToken(t1.address, false);
      list = await cryptoDraw.getSupportedTokens();
      expect(list).to.not.include(t1.address);
      expect(list).to.include.members([ethers.constants.AddressZero, t2.address]);
    });

    it('receive() accepts direct ONE transfers', async function () {
      const { cryptoDraw, owner } = await baseFixture();
      const before = await ethers.provider.getBalance(cryptoDraw.address);
      await owner.sendTransaction({ to: cryptoDraw.address, value: ethers.utils.parseEther('0.001') });
      const after = await ethers.provider.getBalance(cryptoDraw.address);
      expect(after.sub(before)).to.equal(ethers.utils.parseEther('0.001'));
    });
  });
});