const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDraw Contract", function () {
  // Fixture de deploy
  async function deployCryptoDrawFixture() {
    const [owner, user1, user2, user3, consolidator, agent] = await ethers.getSigners();
    
    // Deploy VRF Coordinator Mock
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfCoordinator = await VRFCoordinatorV2Mock.deploy(
      "100000000000000000", // 0.1 LINK base fee
      "1000000000" // 1 gwei gas price
    );
    
    // Create subscription
    await vrfCoordinator.createSubscription();
    const subId = 1;
    await vrfCoordinator.fundSubscription(subId, ethers.utils.parseEther("10"));
    
    // Deploy Price Oracle Mock
    const PriceOracleMock = await ethers.getContractFactory("PriceOracleMock");
    const priceOracle = await PriceOracleMock.deploy();
    
    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    
    // Deploy CryptoDraw
    const CryptoDraw = await ethers.getContractFactory("CryptoDraw");
    const cryptoDraw = await CryptoDraw.deploy(
      vrfCoordinator.address,
      subId,
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // key hash
      ticketNFT.address,
      priceOracle.address
    );
    
    // Configure contracts
    await ticketNFT.setMinter(cryptoDraw.address);
    await vrfCoordinator.addConsumer(subId, cryptoDraw.address);
    
    // Setup game configs
    await cryptoDraw.setGameConfig(1, true, 15, 1, 25, ethers.utils.parseEther("2")); // Lotofácil
    await cryptoDraw.setGameConfig(2, true, 7, 0, 9, ethers.utils.parseEther("1"));   // SuperSete
    
    return { 
      cryptoDraw, 
      ticketNFT, 
      vrfCoordinator, 
      priceOracle,
      owner, 
      user1, 
      user2, 
      user3, 
      consolidator, 
      agent 
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { cryptoDraw, owner } = await loadFixture(deployCryptoDrawFixture);
      expect(await cryptoDraw.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct VRF settings", async function () {
      const { cryptoDraw, vrfCoordinator } = await loadFixture(deployCryptoDrawFixture);
      expect(await cryptoDraw.i_vrfCoordinator()).to.equal(vrfCoordinator.address);
    });

    it("Should have correct initial game configurations", async function () {
      const { cryptoDraw } = await loadFixture(deployCryptoDrawFixture);
      
      const lotofacilConfig = await cryptoDraw.getGameConfig(1);
      expect(lotofacilConfig.enabled).to.be.true;
      expect(lotofacilConfig.numbersToSelect).to.equal(15);
      
      const superseteConfig = await cryptoDraw.getGameConfig(2);
      expect(superseteConfig.enabled).to.be.true;
      expect(superseteConfig.numbersToSelect).to.equal(7);
    });
  });

  describe("Ticket Purchase - Lotofácil", function () {
    it("Should allow buying valid Lotofácil ticket", async function () {
      const { cryptoDraw, user1, ticketNFT } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1; // LOTOFACIL
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      const tx = await cryptoDraw.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        { value }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchased");
      
      expect(event).to.not.be.undefined;
      expect(event.args.buyer).to.equal(user1.address);
      expect(event.args.gameType).to.equal(gameType);
      
      // Verify NFT was minted
      const ticketId = event.args.ticketId;
      expect(await ticketNFT.ownerOf(ticketId)).to.equal(user1.address);
    });

    it("Should reject invalid Lotofácil numbers (wrong count)", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5]; // Only 5 numbers instead of 15
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("InvalidNumbers");
    });

    it("Should reject invalid Lotofácil numbers (out of range)", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 26]; // 26 is out of range
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("InvalidNumbers");
    });

    it("Should reject duplicate Lotofácil numbers", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 14]; // 14 appears twice
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("InvalidNumbers");
    });

    it("Should handle multiple rounds purchase", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 3;
      const value = ethers.utils.parseEther("6"); // 3 rounds * 2 ETH
      
      const tx = await cryptoDraw.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        { value }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchased");
      
      expect(event.args.rounds).to.equal(rounds);
    });

    it("Should reject insufficient payment", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("1"); // Insufficient payment
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("InsufficientPayment");
    });
  });

  describe("Ticket Purchase - SuperSete", function () {
    it("Should allow buying valid SuperSete ticket", async function () {
      const { cryptoDraw, user1, ticketNFT } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 2; // SUPERSETE
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 1;
      const value = ethers.utils.parseEther("1");
      
      const tx = await cryptoDraw.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        { value }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchased");
      
      expect(event).to.not.be.undefined;
      expect(event.args.gameType).to.equal(gameType);
      
      // Verify NFT was minted
      const ticketId = event.args.ticketId;
      expect(await ticketNFT.ownerOf(ticketId)).to.equal(user1.address);
    });

    it("Should reject invalid SuperSete numbers (wrong count)", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 2;
      const numbers = [1, 2, 3]; // Only 3 numbers instead of 7
      const rounds = 1;
      const value = ethers.utils.parseEther("1");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("InvalidNumbers");
    });

    it("Should allow SuperSete with valid range (0-9)", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 2;
      const numbers = [0, 1, 2, 3, 4, 5, 9]; // Including 0 and 9 (valid range)
      const rounds = 1;
      const value = ethers.utils.parseEther("1");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.not.be.reverted;
    });
  });

  describe("Draw Management", function () {
    it("Should create new draw when none exists", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value });
      
      const currentDrawId = await cryptoDraw.getCurrentDrawId(gameType);
      expect(currentDrawId).to.equal(1);
      
      const draw = await cryptoDraw.getDraw(gameType, currentDrawId);
      expect(draw.totalTickets).to.equal(1);
    });

    it("Should allow consolidator to close draw", async function () {
      const { cryptoDraw, user1, consolidator } = await loadFixture(deployCryptoDrawFixture);
      
      // Grant consolidator role
      const CONSOLIDATOR_ROLE = await cryptoDraw.CONSOLIDATOR_ROLE();
      await cryptoDraw.grantRole(CONSOLIDATOR_ROLE, consolidator.address);
      
      // Buy ticket to create draw
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Close draw
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(2); // CLOSED
    });

    it("Should handle VRF randomness request", async function () {
      const { cryptoDraw, user1, consolidator, vrfCoordinator } = await loadFixture(deployCryptoDrawFixture);
      
      // Setup consolidator
      const CONSOLIDATOR_ROLE = await cryptoDraw.CONSOLIDATOR_ROLE();
      await cryptoDraw.grantRole(CONSOLIDATOR_ROLE, consolidator.address);
      
      // Buy ticket
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Close and execute draw
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      
      // Simulate VRF response
      const requestId = 1;
      const randomWords = [12345, 67890];
      await vrfCoordinator.fulfillRandomWords(requestId, cryptoDraw.address);
      
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(5); // RANDOM_FULFILLED
    });
  });

  describe("Prize Distribution", function () {
    it("Should calculate prizes correctly", async function () {
      const { cryptoDraw, user1, user2, consolidator, vrfCoordinator } = await loadFixture(deployCryptoDrawFixture);
      
      // Setup consolidator
      const CONSOLIDATOR_ROLE = await cryptoDraw.CONSOLIDATOR_ROLE();
      await cryptoDraw.grantRole(CONSOLIDATOR_ROLE, consolidator.address);
      
      // Buy multiple tickets
      const gameType = 1;
      const numbers1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const numbers2 = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 1, 2, 3, 4, 5];
      
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers1, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      await cryptoDraw.connect(user2).buyTicket(gameType, numbers2, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Execute draw
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      
      // Fulfill randomness
      const requestId = 1;
      await vrfCoordinator.fulfillRandomWords(requestId, cryptoDraw.address);
      
      // Settle draw
      await cryptoDraw.connect(consolidator).settleDraw(gameType, drawId);
      
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(6); // SETTLED
      expect(draw.totalPool).to.be.gt(0);
    });
  });

  describe("Agent System", function () {
    it("Should track agent commissions", async function () {
      const { cryptoDraw, user1, agent } = await loadFixture(deployCryptoDrawFixture);
      
      // Grant agent role
      const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
      await cryptoDraw.grantRole(AGENT_ROLE, agent.address);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await cryptoDraw.connect(user1).buyTicketWithAgent(
        gameType,
        numbers,
        rounds,
        agent.address,
        { value }
      );
      
      const commission = await cryptoDraw.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);
    });

    it("Should allow agents to withdraw commissions", async function () {
      const { cryptoDraw, user1, agent } = await loadFixture(deployCryptoDrawFixture);
      
      // Grant agent role
      const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
      await cryptoDraw.grantRole(AGENT_ROLE, agent.address);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await cryptoDraw.connect(user1).buyTicketWithAgent(
        gameType,
        numbers,
        rounds,
        agent.address,
        { value }
      );
      
      const initialBalance = await ethers.provider.getBalance(agent.address);
      await cryptoDraw.connect(agent).withdrawCommission();
      const finalBalance = await ethers.provider.getBalance(agent.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Security and Access Control", function () {
    it("Should prevent non-owners from setting game config", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      await expect(
        cryptoDraw.connect(user1).setGameConfig(3, true, 10, 1, 50, ethers.utils.parseEther("5"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-consolidators from closing draws", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      await expect(
        cryptoDraw.connect(user1).closeDraw(1, 1)
      ).to.be.revertedWith("AccessControl:");
    });

    it("Should handle paused state correctly", async function () {
      const { cryptoDraw, user1, owner } = await loadFixture(deployCryptoDrawFixture);
      
      await cryptoDraw.connect(owner).pause();
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value })
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency withdrawal by owner", async function () {
      const { cryptoDraw, user1, owner } = await loadFixture(deployCryptoDrawFixture);
      
      // Add funds to contract
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      
      const contractBalance = await ethers.provider.getBalance(cryptoDraw.address);
      expect(contractBalance).to.be.gt(0);
      
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      await cryptoDraw.connect(owner).emergencyWithdraw();
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });

    it("Should prevent non-owners from emergency withdrawal", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      await expect(
        cryptoDraw.connect(user1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for ticket purchase", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployCryptoDrawFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const value = ethers.utils.parseEther("2");
      
      const tx = await cryptoDraw.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        { value }
      );
      
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(500000); // Should use less than 500k gas
    });
  });
});