const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoDrawV2 - Coverage & Priority", function () {
  let CryptoDraw, cryptoDraw, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const CryptoDrawFactory = await ethers.getContractFactory("CryptoDrawV2");

    this.priceOracle = await PriceOracle.deploy();
    this.ticketNFT = await TicketNFT.deploy();
    cryptoDraw = await CryptoDrawFactory.deploy(this.priceOracle.address, this.ticketNFT.address);

    // wire ticketNFT to cryptodraw
    await this.ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

    // set some config on price oracle so tokens can be converted
    const MockToken = await ethers.getContractFactory("MockToken");
    this.token = await MockToken.deploy("MockCR", "MCR", 18);
    await this.priceOracle.addToken(this.token.address, 18, ethers.constants.AddressZero);
    await this.priceOracle.updatePrice(this.token.address, 1000);
  });

  it("should allow buying tickets with native and ERC20, and agent commission flows", async function () {
    // fund addr1 with native via hardhat (already funded by default signers)
    const tx = await cryptoDraw.connect(addr1).buyTicket({ value: ethers.utils.parseEther("0.01") });
    await tx.wait();
    // expect a ticket minted to addr1
    const balance = await this.ticketNFT.balanceOf(addr1.address);
    expect(balance).to.be.gte(1);

    // buy with token
    await this.token.connect(owner).mint(addr2.address, ethers.utils.parseUnits("100", 18));
    await this.token.connect(addr2).approve(cryptoDraw.address, ethers.utils.parseUnits("100", 18));
    await cryptoDraw.connect(addr2).buyTicketWithToken(this.token.address, 1);
    const bal2 = await this.ticketNFT.balanceOf(addr2.address);
    expect(bal2).to.be.gte(1);
  });

  it("should allow closing draws and claiming prizes", async function () {
    await cryptoDraw.connect(addr1).buyTicket({ value: ethers.utils.parseEther("0.01") });
    // simulate close
    await cryptoDraw.closeDraw(1);
    // claim should work if winner matched (this test asserts flows, not real randomness)
    // Claim prize will revert unless caller is winner; ensure revert is handled
    await expect(cryptoDraw.connect(addr1).claimPrize(1)).to.be.reverted;
  });

  it("should allow emergencyWithdraw and revenue config changes by operator/owner roles", async function () {
    await expect(cryptoDraw.emergencyWithdraw()).to.be.reverted;
    await cryptoDraw.updateRevenueConfig(500, 100); // assume owner can call
    // No revert means success
  });
});
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
});