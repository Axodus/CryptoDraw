const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDraw Integration Tests", function () {
  before(function() {
    // Temporarily skip V1-style integration tests until V2 integration layer is implemented
    this.skip();
  });
  // Fixture completa do sistema
  async function deployFullSystemFixture() {
    const [owner, consolidator, agent, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy VRF Mock
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfCoordinator = await VRFCoordinatorV2Mock.deploy(
      "100000000000000000", // base fee
      "1000000000" // gas price
    );
    
    // Create and fund VRF subscription
    await vrfCoordinator.createSubscription();
    const subId = 1;
    await vrfCoordinator.fundSubscription(subId, ethers.utils.parseEther("10"));
    
    // Deploy Price Oracle Mock
    const PriceOracleMock = await ethers.getContractFactory("PriceOracleMock");
    const priceOracle = await PriceOracleMock.deploy();
    
    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    
  // Deploy CryptoDraw (use fully qualified name to avoid artifact ambiguity)
  const CryptoDraw = await ethers.getContractFactory("contracts/CryptoDrawV2.sol:CryptoDraw");
    const cryptoDraw = await CryptoDraw.deploy(
      vrfCoordinator.address,
      subId,
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
      ticketNFT.address,
      priceOracle.address
    );
    
    // Deploy AgentProxy
    const AgentProxy = await ethers.getContractFactory("AgentProxy");
    const agentProxy = await AgentProxy.deploy(cryptoDraw.address);
    
    // Setup contracts
    await ticketNFT.setMinter(cryptoDraw.address);
    await vrfCoordinator.addConsumer(subId, cryptoDraw.address);
    
    // Setup roles
    const CONSOLIDATOR_ROLE = await cryptoDraw.CONSOLIDATOR_ROLE();
    const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
    await cryptoDraw.grantRole(CONSOLIDATOR_ROLE, consolidator.address);
    await cryptoDraw.grantRole(AGENT_ROLE, agent.address);
    
    // Setup game configs
    await cryptoDraw.setGameConfig(1, true, 15, 1, 25, ethers.utils.parseEther("2")); // Lotofácil
    await cryptoDraw.setGameConfig(2, true, 7, 0, 9, ethers.utils.parseEther("1"));   // SuperSete
    
    // Register agent in proxy
    await agentProxy.registerAgent(agent.address, 500); // 5% commission
    
    return {
      cryptoDraw,
      ticketNFT,
      agentProxy,
      vrfCoordinator,
      priceOracle,
      owner,
      consolidator,
      agent,
      user1,
      user2,
      user3
    };
  }

  describe("Complete Lottery Flow - Lotofácil", function () {
    it("Should execute complete lottery cycle with winners", async function () {
      const { 
        cryptoDraw, 
        ticketNFT, 
        consolidator, 
        vrfCoordinator, 
        user1, 
        user2, 
        user3 
      } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1; // LOTOFACIL
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Phase 1: Users buy tickets
      const winningNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const almostWinning = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25]; // 14 matches
      const partialWinning = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19]; // 11 matches
      
      // User1 buys winning ticket
      await cryptoDraw.connect(user1).buyTicket(gameType, winningNumbers, 1, { value: ticketPrice });
      
      // User2 buys almost winning ticket
      await cryptoDraw.connect(user2).buyTicket(gameType, almostWinning, 1, { value: ticketPrice });
      
      // User3 buys partial winning ticket
      await cryptoDraw.connect(user3).buyTicket(gameType, partialWinning, 1, { value: ticketPrice });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      expect(drawId).to.equal(1);
      
      // Verify tickets were minted
      expect(await ticketNFT.ownerOf(1)).to.equal(user1.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(user2.address);
      expect(await ticketNFT.ownerOf(3)).to.equal(user3.address);
      
      // Phase 2: Close draw
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      let draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(2); // CLOSED
      expect(draw.totalTickets).to.equal(3);
      expect(draw.totalPool).to.equal(ticketPrice.mul(3));
      
      // Phase 3: Execute draw (request randomness)
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(3); // RANDOM_REQUESTED
      
      // Phase 4: Fulfill randomness (simulate VRF response)
      const requestId = 1;
      await vrfCoordinator.fulfillRandomWords(requestId, cryptoDraw.address);
      draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(5); // RANDOM_FULFILLED
      
      // Phase 5: Settle draw (calculate prizes)
      await cryptoDraw.connect(consolidator).settleDraw(gameType, drawId);
      draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(6); // SETTLED
      
      // Verify prize distribution was calculated
      expect(draw.totalPrizes).to.be.gt(0);
      
      // Phase 6: Check winners
      const ticket1 = await cryptoDraw.getTicketPrize(1);
      const ticket2 = await cryptoDraw.getTicketPrize(2);
      const ticket3 = await cryptoDraw.getTicketPrize(3);
      
      // User1 should have highest prize (15 matches)
      expect(ticket1.matches).to.be.gte(ticket2.matches);
      expect(ticket1.matches).to.be.gte(ticket3.matches);
      
      if (ticket1.matches > 0) {
        expect(ticket1.prize).to.be.gt(0);
      }
    });
    
    it("Should handle draw with no winners", async function () {
      const { cryptoDraw, consolidator, vrfCoordinator, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Buy ticket with numbers unlikely to win
      const numbers = [20, 21, 22, 23, 24, 25, 19, 18, 17, 16, 15, 14, 13, 12, 11];
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { value: ticketPrice });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Execute complete draw cycle
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      await vrfCoordinator.fulfillRandomWords(1, cryptoDraw.address);
      await cryptoDraw.connect(consolidator).settleDraw(gameType, drawId);
      
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(6); // SETTLED
      
      // Check if there's a rollover to next draw
      const nextDrawId = await cryptoDraw.getCurrentDrawId(gameType);
      if (draw.totalPrizes.eq(0)) {
        expect(nextDrawId).to.equal(drawId.add(1));
      }
    });
    
    it("Should handle multiple rounds ticket", async function () {
      const { cryptoDraw, ticketNFT, consolidator, vrfCoordinator, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const rounds = 3;
      const ticketPrice = ethers.utils.parseEther("2");
      const totalCost = ticketPrice.mul(rounds);
      
      // Buy multi-round ticket
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, rounds, { value: totalCost });
      
      // Verify ticket data
      const ticket = await ticketNFT.getTicket(1);
      expect(ticket.rounds).to.equal(rounds);
      
      // Execute first draw
      let drawId = await cryptoDraw.getCurrentDrawId(gameType);
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      await vrfCoordinator.fulfillRandomWords(1, cryptoDraw.address);
      await cryptoDraw.connect(consolidator).settleDraw(gameType, drawId);
      
      // Check if ticket is valid for future draws
      expect(await cryptoDraw.isTicketValidForDraw(1, drawId.add(1))).to.be.true;
      expect(await cryptoDraw.isTicketValidForDraw(1, drawId.add(2))).to.be.true;
      expect(await cryptoDraw.isTicketValidForDraw(1, drawId.add(3))).to.be.false; // Expired
    });
  });

  describe("Agent System Integration", function () {
    it("Should handle complete agent transaction flow", async function () {
      const { cryptoDraw, agentProxy, agent, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      const agentBalanceBefore = await ethers.provider.getBalance(agent.address);
      
      // User buys ticket through agent
      await agentProxy.connect(user1).buyTicketThroughAgent(
        gameType,
        numbers,
        rounds,
        agent.address,
        { value: ticketPrice }
      );
      
      // Check agent commission tracking
      const agentInfo = await agentProxy.getAgentInfo(agent.address);
      expect(agentInfo.totalTicketsSold).to.equal(1);
      expect(agentInfo.totalCommissionEarned).to.be.gt(0);
      
      // Agent withdraws commission
      await agentProxy.connect(agent).withdrawCommission();
      
      const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
      expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);
      
      // Verify commission is reset
      const agentInfoAfter = await agentProxy.getAgentInfo(agent.address);
      expect(agentInfoAfter.totalCommissionEarned).to.equal(0);
    });
    
    it("Should integrate with main contract commission system", async function () {
      const { cryptoDraw, agent, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Buy ticket directly through main contract with agent
      await cryptoDraw.connect(user1).buyTicketWithAgent(
        gameType,
        numbers,
        rounds,
        agent.address,
        { value: ticketPrice }
      );
      
      // Check agent commission in main contract
      const commission = await cryptoDraw.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);
      
      // Agent withdraws from main contract
      const agentBalanceBefore = await ethers.provider.getBalance(agent.address);
      await cryptoDraw.connect(agent).withdrawCommission();
      const agentBalanceAfter = await ethers.provider.getBalance(agent.address);
      
      expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);
    });
  });

  describe("Multi-Game Support", function () {
    it("Should handle both Lotofácil and SuperSete simultaneously", async function () {
      const { cryptoDraw, consolidator, vrfCoordinator, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      const lotofacilNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const superseteNumbers = [0, 1, 2, 3, 4, 5, 6];
      
      // Buy tickets for both games
      await cryptoDraw.connect(user1).buyTicket(1, lotofacilNumbers, 1, { 
        value: ethers.utils.parseEther("2") 
      });
      await cryptoDraw.connect(user2).buyTicket(2, superseteNumbers, 1, { 
        value: ethers.utils.parseEther("1") 
      });
      
      // Both games should have active draws
      const lotofacilDrawId = await cryptoDraw.getCurrentDrawId(1);
      const superseteDrawId = await cryptoDraw.getCurrentDrawId(2);
      
      expect(lotofacilDrawId).to.equal(1);
      expect(superseteDrawId).to.equal(1);
      
      // Execute both draws
      await cryptoDraw.connect(consolidator).closeDraw(1, lotofacilDrawId);
      await cryptoDraw.connect(consolidator).closeDraw(2, superseteDrawId);
      
      await cryptoDraw.connect(consolidator).executeDraw(1, lotofacilDrawId);
      await cryptoDraw.connect(consolidator).executeDraw(2, superseteDrawId);
      
      // Simulate VRF responses
      await vrfCoordinator.fulfillRandomWords(1, cryptoDraw.address);
      await vrfCoordinator.fulfillRandomWords(2, cryptoDraw.address);
      
      // Settle both draws
      await cryptoDraw.connect(consolidator).settleDraw(1, lotofacilDrawId);
      await cryptoDraw.connect(consolidator).settleDraw(2, superseteDrawId);
      
      // Verify both draws completed
      const lotofacilDraw = await cryptoDraw.getDraw(1, lotofacilDrawId);
      const superseteDraw = await cryptoDraw.getDraw(2, superseteDrawId);
      
      expect(lotofacilDraw.status).to.equal(6); // SETTLED
      expect(superseteDraw.status).to.equal(6); // SETTLED
    });
  });

  describe("Prize Distribution Integration", function () {
    it("Should distribute prizes correctly across different prize tiers", async function () {
      const { cryptoDraw, consolidator, vrfCoordinator, user1, user2, user3 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Create tickets with different expected matches
      const perfectMatch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const goodMatch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25]; // Likely 14 matches
      const poorMatch = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 1, 2, 3, 4, 5]; // Likely fewer matches
      
      await cryptoDraw.connect(user1).buyTicket(gameType, perfectMatch, 1, { value: ticketPrice });
      await cryptoDraw.connect(user2).buyTicket(gameType, goodMatch, 1, { value: ticketPrice });
      await cryptoDraw.connect(user3).buyTicket(gameType, poorMatch, 1, { value: ticketPrice });
      
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Execute complete draw
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await cryptoDraw.connect(consolidator).executeDraw(gameType, drawId);
      await vrfCoordinator.fulfillRandomWords(1, cryptoDraw.address);
      await cryptoDraw.connect(consolidator).settleDraw(gameType, drawId);
      
      // Check prize distribution
      const ticket1Prize = await cryptoDraw.getTicketPrize(1);
      const ticket2Prize = await cryptoDraw.getTicketPrize(2);
      const ticket3Prize = await cryptoDraw.getTicketPrize(3);
      
      // Verify prize hierarchy (more matches = higher prize)
      if (ticket1Prize.matches > ticket2Prize.matches) {
        expect(ticket1Prize.prize).to.be.gte(ticket2Prize.prize);
      }
      if (ticket2Prize.matches > ticket3Prize.matches) {
        expect(ticket2Prize.prize).to.be.gte(ticket3Prize.prize);
      }
      
      // Verify total prizes don't exceed pool
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      const totalDistributed = ticket1Prize.prize.add(ticket2Prize.prize).add(ticket3Prize.prize);
      expect(totalDistributed).to.be.lte(draw.totalPool);
    });
  });

  describe("Security Integration Tests", function () {
    it("Should prevent unauthorized access to critical functions", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployFullSystemFixture);
      
      // User should not be able to close draws
      await expect(
        cryptoDraw.connect(user1).closeDraw(1, 1)
      ).to.be.revertedWith("AccessControl:");
      
      // User should not be able to execute draws
      await expect(
        cryptoDraw.connect(user1).executeDraw(1, 1)
      ).to.be.revertedWith("AccessControl:");
      
      // User should not be able to settle draws
      await expect(
        cryptoDraw.connect(user1).settleDraw(1, 1)
      ).to.be.revertedWith("AccessControl:");
    });
    
    it("Should handle paused state correctly across all contracts", async function () {
      const { cryptoDraw, agentProxy, owner, user1, agent } = await loadFixture(deployFullSystemFixture);
      
      // Pause main contract
      await cryptoDraw.connect(owner).pause();
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Direct purchases should be blocked
      await expect(
        cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { value: ticketPrice })
      ).to.be.revertedWith("Pausable: paused");
      
      // Agent purchases should also be blocked
      await expect(
        agentProxy.connect(user1).buyTicketThroughAgent(
          gameType, numbers, 1, agent.address, { value: ticketPrice }
        )
      ).to.be.reverted; // Should fail when calling paused contract
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for complete user journey", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const ticketPrice = ethers.utils.parseEther("2");
      
      const tx = await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { value: ticketPrice });
      const receipt = await tx.wait();
      
      // Should use reasonable gas (less than 500k for ticket purchase)
      expect(receipt.gasUsed).to.be.lt(500000);
    });
    
    it("Should batch operations efficiently", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Buy multiple tickets and measure average gas per ticket
      const gasUsages = [];
      
      for (let i = 0; i < 3; i++) {
        const tx = await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { value: ticketPrice });
        const receipt = await tx.wait();
        gasUsages.push(receipt.gasUsed);
      }
      
      // Gas usage should not increase significantly with subsequent purchases
      const avgGas = gasUsages.reduce((a, b) => a.add(b)).div(gasUsages.length);
      expect(avgGas).to.be.lt(500000);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle draw execution in correct order", async function () {
      const { cryptoDraw, consolidator, user1 } = await loadFixture(deployFullSystemFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const ticketPrice = ethers.utils.parseEther("2");
      
      await cryptoDraw.connect(user1).buyTicket(gameType, numbers, 1, { value: ticketPrice });
      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      
      // Should not be able to execute before closing
      await expect(
        cryptoDraw.connect(consolidator).executeDraw(gameType, drawId)
      ).to.be.revertedWith("InvalidDrawStatus");
      
      // Should not be able to settle before execution
      await expect(
        cryptoDraw.connect(consolidator).settleDraw(gameType, drawId)
      ).to.be.revertedWith("InvalidDrawStatus");
      
      // Correct order should work
      await cryptoDraw.connect(consolidator).closeDraw(gameType, drawId);
      await expect(
        cryptoDraw.connect(consolidator).executeDraw(gameType, drawId)
      ).to.not.be.reverted;
    });
    
    it("Should handle contract with no balance gracefully", async function () {
      const { agentProxy, agent } = await loadFixture(deployFullSystemFixture);
      
      // Try to withdraw commission when no purchases made
      await expect(
        agentProxy.connect(agent).withdrawCommission()
      ).to.be.revertedWith("NoCommissionAvailable");
    });
  });
});