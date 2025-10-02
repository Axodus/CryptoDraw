const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDrawV2 Contract", function () {
  // Fixture de deploy
  async function deployCryptoDrawV2Fixture() {
    const [owner, operator, agent, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy GameLibrary
    const GameLibrary = await ethers.getContractFactory("GameLibrary");
    const gameLibrary = await GameLibrary.deploy();
    
    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    
    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    
    // Wallets de destino
    const treasuryWallet = owner.address;
    const prizeWallet = owner.address;
    const projectFund = owner.address;
    const grantFund = owner.address;
    const operationFund = owner.address;
    
    // Deploy CryptoDrawV2
    const CryptoDrawV2 = await ethers.getContractFactory("CryptoDrawV2", {
      libraries: {
        GameLibrary: gameLibrary.address,
      },
    });
    
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
    await ticketNFT.setMinter(cryptoDrawV2.address);
    
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
    it("Should allow admin to configure SuperSete game", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const gameType = 0; // SUPERSETE
      const ticketPriceUSD = ethers.utils.parseEther("1"); // $1
      const drawInterval = 24 * 60 * 60; // 1 day
      
      await cryptoDrawV2.connect(owner).configureGame(
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
      
      await cryptoDrawV2.connect(owner).configureGame(
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
        cryptoDrawV2.connect(user1).configureGame(
          0, // SUPERSETE
          ethers.utils.parseEther("1"),
          24 * 60 * 60,
          true
        )
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should emit GameConfigured event", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const gameType = 0;
      const ticketPriceUSD = ethers.utils.parseEther("1");
      const drawInterval = 24 * 60 * 60;
      
      await expect(
        cryptoDrawV2.connect(owner).configureGame(gameType, ticketPriceUSD, drawInterval, true)
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
      
      await cryptoDrawV2.connect(owner).updateTokenSupport(mockToken.address, true);
      
      expect(await cryptoDrawV2.supportedTokens(mockToken.address)).to.be.true;
    });

    it("Should allow admin to remove supported payment token", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
      
      // Add then remove
      await cryptoDrawV2.connect(owner).updateTokenSupport(mockToken.address, true);
      await cryptoDrawV2.connect(owner).updateTokenSupport(mockToken.address, false);
      
      expect(await cryptoDrawV2.supportedTokens(mockToken.address)).to.be.false;
    });

    it("Should emit TokenSupportUpdated event", async function () {
      const { cryptoDrawV2, owner } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
      
      await expect(
        cryptoDrawV2.connect(owner).updateTokenSupport(mockToken.address, true)
      ).to.emit(cryptoDrawV2, "TokenSupportUpdated")
       .withArgs(mockToken.address, true);
    });
  });

  describe("Draw Management", function () {
    beforeEach(async function () {
      const { cryptoDrawV2, owner } = this;
      
      // Configure SuperSete game
      await cryptoDrawV2.connect(owner).configureGame(
        0, // SUPERSETE
        ethers.utils.parseEther("1"), // $1
        24 * 60 * 60, // 1 day
        true
      );
    });

    it("Should allow operator to create new draw", async function () {
      const { cryptoDrawV2, operator } = await loadFixture(deployCryptoDrawV2Fixture);
      await cryptoDrawV2.configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      const gameType = 0; // SUPERSETE
      
      await cryptoDrawV2.connect(operator).createDraw(gameType);
      
      const config = await cryptoDrawV2.gameConfigs(gameType);
      expect(config.currentDrawId).to.equal(1);
      
      const draw = await cryptoDrawV2.draws(gameType, 1);
      expect(draw.game).to.equal(gameType);
      expect(draw.status).to.equal(1); // OPEN
    });

    it("Should prevent non-operator from creating draws", async function () {
      const { cryptoDrawV2, owner, user1 } = await loadFixture(deployCryptoDrawV2Fixture);
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await expect(
        cryptoDrawV2.connect(user1).createDraw(0)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should allow operator to close draw", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await cryptoDrawV2.connect(operator).createDraw(0);
      await cryptoDrawV2.connect(operator).closeDraw(0, 1);
      
      const draw = await cryptoDrawV2.draws(0, 1);
      expect(draw.status).to.equal(2); // CLOSED
    });

    it("Should emit DrawCreated event", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await expect(
        cryptoDrawV2.connect(operator).createDraw(0)
      ).to.emit(cryptoDrawV2, "DrawCreated")
       .withArgs(0, 1, anyValue);
    });

    it("Should emit DrawClosed event", async function () {
      const { cryptoDrawV2, owner, operator } = await loadFixture(deployCryptoDrawV2Fixture);
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      
      await cryptoDrawV2.connect(operator).createDraw(0);
      
      await expect(
        cryptoDrawV2.connect(operator).closeDraw(0, 1)
      ).to.emit(cryptoDrawV2, "DrawClosed")
       .withArgs(0, 1);
    });
  });

  describe("Ticket Purchase - Native ETH", function () {
    beforeEach(async function () {
      const { cryptoDrawV2, owner, operator } = this;
      
      // Configure game and create draw
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
    });

    it("Should allow buying SuperSete ticket with ETH", async function () {
      const { cryptoDrawV2, owner, operator, user1, ticketNFT, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      
      // Set ETH price to $2000 (so $1 = 0.0005 ETH)
      await priceOracle.setPrice(200000000000); // $2000 with 8 decimals
      
      const gameType = 0; // SUPERSETE
      const numbers = [1, 2, 3, 4, 5, 6, 7]; // 7 numbers for SuperSete
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005"); // $1 worth of ETH
      
      const tx = await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero, // No agent
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

    it("Should reject invalid SuperSete numbers (wrong count)", async function () {
      const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
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
          { value: requiredETH }
        )
      ).to.be.revertedWithCustomError(cryptoDrawV2, "InvalidNumbers");
    });

    it("Should reject insufficient payment", async function () {
      const { cryptoDrawV2, owner, operator, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
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
          { value: insufficientETH }
        )
      ).to.be.revertedWithCustomError(cryptoDrawV2, "InsufficientPayment");
    });
  });

  describe("Ticket Purchase - ERC20 Token", function () {
    let mockToken;

    beforeEach(async function () {
      const { cryptoDrawV2, owner, operator, user1 } = this;
      
      // Deploy mock token
      const MockToken = await ethers.getContractFactory("MockToken");
      mockToken = await MockToken.deploy("USD Token", "USDT", 6); // 6 decimals like USDT
      
      // Add token support
      await cryptoDrawV2.connect(owner).updateTokenSupport(mockToken.address, true);
      
      // Configure game and create draw
      await cryptoDrawV2.connect(owner).configureGame(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true); // EasyLotto
      await cryptoDrawV2.connect(operator).createDraw(1);
      
      // Give user tokens
      await mockToken.mint(user1.address, ethers.utils.parseUnits("1000", 6)); // 1000 USDT
    });

    it("Should allow buying EasyLotto ticket with ERC20 token", async function () {
      const { cryptoDrawV2, user1, ticketNFT } = await loadFixture(deployCryptoDrawV2Fixture);
      
      const MockToken = await ethers.getContractFactory("MockToken");
      const mockToken = await MockToken.deploy("USD Token", "USDT", 6);
      
      await cryptoDrawV2.updateTokenSupport(mockToken.address, true);
      await cryptoDrawV2.configureGame(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);
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
      
      await cryptoDrawV2.configureGame(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);
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
      ).to.be.revertedWithCustomError(cryptoDrawV2, "InvalidPaymentToken");
    });
  });

  describe("Agent System", function () {
    it("Should calculate agent commission correctly", async function () {
      const { cryptoDrawV2, owner, operator, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        agent.address, // With agent
        { value: requiredETH }
      );
      
      const commission = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);
      
      // Should be approximately 8.61% of ticket price in USD
      const expectedCommission = ethers.utils.parseEther("1").mul(861).div(10000); // 8.61% of $1
      expect(commission).to.be.closeTo(expectedCommission, ethers.utils.parseEther("0.01"));
    });

    it("Should allow agent to withdraw commission", async function () {
      const { cryptoDrawV2, owner, operator, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        agent.address,
        { value: requiredETH }
      );
      
      const commissionBefore = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commissionBefore).to.be.gt(0);
      
      await cryptoDrawV2.connect(agent).withdrawCommission();
      
      const commissionAfter = await cryptoDrawV2.agentCommissions(agent.address);
      expect(commissionAfter).to.equal(0);
    });

    it("Should prevent suspended agents from earning commission", async function () {
      const { cryptoDrawV2, owner, operator, agent, user1, priceOracle } = await loadFixture(deployCryptoDrawV2Fixture);
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
      // Suspend agent
      await cryptoDrawV2.connect(owner).suspendAgent(agent.address, true);
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.0005");
      
      await expect(
        cryptoDrawV2.connect(user1).buyTicket(
          gameType,
          numbers,
          rounds,
          agent.address,
          { value: requiredETH }
        )
      ).to.be.revertedWithCustomError(cryptoDrawV2, "AgentSuspended");
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
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000);
      
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
      
      await cryptoDrawV2.connect(owner).configureGame(0, ethers.utils.parseEther("10"), 24 * 60 * 60, true); // $10 ticket
      await cryptoDrawV2.connect(operator).createDraw(0);
      await priceOracle.setPrice(200000000000); // $2000 ETH
      
      const gameType = 0;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const requiredETH = ethers.utils.parseEther("0.005"); // $10 worth
      
      const tx = await cryptoDrawV2.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
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
      ).to.be.revertedWithCustomError(cryptoDrawV2, "InvalidRevenueConfig");
    });
  });
});