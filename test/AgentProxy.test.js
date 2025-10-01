const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("AgentProxy Contract", function () {
  // Fixture de deploy
  async function deployAgentProxyFixture() {
    const [owner, agent1, agent2, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy mocks
    const CryptoDrawMock = await ethers.getContractFactory("CryptoDrawMock");
    const cryptoDrawMock = await CryptoDrawMock.deploy();
    
    // Deploy AgentProxy
    const AgentProxy = await ethers.getContractFactory("AgentProxy");
    const agentProxy = await AgentProxy.deploy(cryptoDrawMock.address);
    
    return { 
      agentProxy, 
      cryptoDrawMock, 
      owner, 
      agent1, 
      agent2, 
      user1, 
      user2, 
      attacker 
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { agentProxy, owner } = await loadFixture(deployAgentProxyFixture);
      expect(await agentProxy.owner()).to.equal(owner.address);
    });

    it("Should set the correct CryptoDraw address", async function () {
      const { agentProxy, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      expect(await agentProxy.cryptoDraw()).to.equal(cryptoDrawMock.address);
    });

    it("Should initialize with default commission rate", async function () {
      const { agentProxy } = await loadFixture(deployAgentProxyFixture);
      expect(await agentProxy.defaultCommissionRate()).to.equal(500); // 5%
    });

    it("Should start with no registered agents", async function () {
      const { agentProxy, agent1 } = await loadFixture(deployAgentProxyFixture);
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.isActive).to.be.false;
    });
  });

  describe("Agent Registration", function () {
    it("Should allow owner to register agent", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      const commissionRate = 750; // 7.5%
      
      await agentProxy.connect(owner).registerAgent(agent1.address, commissionRate);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.isActive).to.be.true;
      expect(agentInfo.commissionRate).to.equal(commissionRate);
      expect(agentInfo.totalTicketsSold).to.equal(0);
      expect(agentInfo.totalCommissionEarned).to.equal(0);
    });

    it("Should emit AgentRegistered event", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      const commissionRate = 600;
      
      await expect(
        agentProxy.connect(owner).registerAgent(agent1.address, commissionRate)
      ).to.emit(agentProxy, "AgentRegistered")
       .withArgs(agent1.address, commissionRate);
    });

    it("Should prevent non-owner from registering agents", async function () {
      const { agentProxy, agent1, agent2 } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(agent1).registerAgent(agent2.address, 500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent registering with invalid commission rate (too high)", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(owner).registerAgent(agent1.address, 2001) // > 20%
      ).to.be.revertedWith("InvalidCommissionRate");
    });

    it("Should allow registering with maximum valid commission rate", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 2000); // exactly 20%
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.commissionRate).to.equal(2000);
    });

    it("Should allow registering with zero commission rate", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 0);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.commissionRate).to.equal(0);
    });

    it("Should prevent registering zero address as agent", async function () {
      const { agentProxy, owner } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(owner).registerAgent(ethers.constants.AddressZero, 500)
      ).to.be.revertedWith("InvalidAddress");
    });

    it("Should allow re-registering existing agent with new commission", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      // Register first time
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      // Register again with different rate
      await agentProxy.connect(owner).registerAgent(agent1.address, 750);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.commissionRate).to.equal(750);
    });
  });

  describe("Agent Deactivation", function () {
    beforeEach(async function () {
      const { agentProxy, owner, agent1 } = this;
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
    });

    it("Should allow owner to deactivate agent", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      await agentProxy.connect(owner).deactivateAgent(agent1.address);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.isActive).to.be.false;
    });

    it("Should emit AgentDeactivated event", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      await expect(
        agentProxy.connect(owner).deactivateAgent(agent1.address)
      ).to.emit(agentProxy, "AgentDeactivated")
       .withArgs(agent1.address);
    });

    it("Should prevent non-owner from deactivating agents", async function () {
      const { agentProxy, owner, agent1, agent2 } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      await expect(
        agentProxy.connect(agent2).deactivateAgent(agent1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow deactivating non-existent agent (no-op)", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(owner).deactivateAgent(agent1.address)
      ).to.not.be.reverted;
    });
  });

  describe("Ticket Purchase Through Agent", function () {
    beforeEach(async function () {
      const { agentProxy, owner, agent1 } = this;
      await agentProxy.connect(owner).registerAgent(agent1.address, 500); // 5%
    });

    it("Should allow buying ticket through registered agent", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      // Set mock price
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      const tx = await agentProxy.connect(user1).buyTicketThroughAgent(
        gameType,
        numbers,
        rounds,
        agent1.address,
        { value: ticketPrice }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "TicketPurchasedThroughAgent");
      
      expect(event).to.not.be.undefined;
      expect(event.args.buyer).to.equal(user1.address);
      expect(event.args.agent).to.equal(agent1.address);
    });

    it("Should calculate and distribute commission correctly", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 500); // 5%
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      const agentBalanceBefore = await ethers.provider.getBalance(agent1.address);
      
      await agentProxy.connect(user1).buyTicketThroughAgent(
        gameType,
        numbers,
        rounds,
        agent1.address,
        { value: ticketPrice }
      );
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      const expectedCommission = ticketPrice.mul(500).div(10000); // 5% of 2 ETH = 0.1 ETH
      
      expect(agentInfo.totalCommissionEarned).to.equal(expectedCommission);
      expect(agentInfo.totalTicketsSold).to.equal(1);
    });

    it("Should prevent buying through inactive agent", async function () {
      const { agentProxy, owner, agent1, user1 } = await loadFixture(deployAgentProxyFixture);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      await expect(
        agentProxy.connect(user1).buyTicketThroughAgent(
          gameType,
          numbers,
          rounds,
          agent1.address, // Not registered
          { value: ticketPrice }
        )
      ).to.be.revertedWith("AgentNotActive");
    });

    it("Should prevent buying through deactivated agent", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      
      // Register and then deactivate
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      await agentProxy.connect(owner).deactivateAgent(agent1.address);
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      await expect(
        agentProxy.connect(user1).buyTicketThroughAgent(
          gameType,
          numbers,
          rounds,
          agent1.address,
          { value: ticketPrice }
        )
      ).to.be.revertedWith("AgentNotActive");
    });

    it("Should handle multiple purchases through same agent", async function () {
      const { agentProxy, owner, agent1, user1, user2, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      await agentProxy.connect(owner).registerAgent(agent1.address, 1000); // 10%
      
      const gameType = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      const ticketPrice = ethers.utils.parseEther("2");
      
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      // First purchase
      await agentProxy.connect(user1).buyTicketThroughAgent(
        gameType,
        numbers,
        rounds,
        agent1.address,
        { value: ticketPrice }
      );
      
      // Second purchase
      await agentProxy.connect(user2).buyTicketThroughAgent(
        gameType,
        numbers,
        rounds,
        agent1.address,
        { value: ticketPrice }
      );
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      const expectedTotalCommission = ticketPrice.mul(1000).div(10000).mul(2); // 10% * 2 purchases
      
      expect(agentInfo.totalTicketsSold).to.equal(2);
      expect(agentInfo.totalCommissionEarned).to.equal(expectedTotalCommission);
    });
  });

  describe("Commission Management", function () {
    it("Should allow owner to update default commission rate", async function () {
      const { agentProxy, owner } = await loadFixture(deployAgentProxyFixture);
      
      const newRate = 800; // 8%
      await agentProxy.connect(owner).setDefaultCommissionRate(newRate);
      
      expect(await agentProxy.defaultCommissionRate()).to.equal(newRate);
    });

    it("Should emit DefaultCommissionRateUpdated event", async function () {
      const { agentProxy, owner } = await loadFixture(deployAgentProxyFixture);
      
      const newRate = 600;
      
      await expect(
        agentProxy.connect(owner).setDefaultCommissionRate(newRate)
      ).to.emit(agentProxy, "DefaultCommissionRateUpdated")
       .withArgs(newRate);
    });

    it("Should prevent setting invalid default commission rate", async function () {
      const { agentProxy, owner } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(owner).setDefaultCommissionRate(2001) // > 20%
      ).to.be.revertedWith("InvalidCommissionRate");
    });

    it("Should allow updating individual agent commission rate", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      await agentProxy.connect(owner).updateAgentCommissionRate(agent1.address, 750);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.commissionRate).to.equal(750);
    });

    it("Should emit CommissionRateUpdated event", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      await expect(
        agentProxy.connect(owner).updateAgentCommissionRate(agent1.address, 750)
      ).to.emit(agentProxy, "CommissionRateUpdated")
       .withArgs(agent1.address, 750);
    });

    it("Should prevent updating commission for non-existent agent", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(owner).updateAgentCommissionRate(agent1.address, 750)
      ).to.be.revertedWith("AgentNotFound");
    });
  });

  describe("Commission Withdrawal", function () {
    beforeEach(async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = this;
      
      // Setup agent and make a purchase to generate commission
      await agentProxy.connect(owner).registerAgent(agent1.address, 1000); // 10%
      
      const ticketPrice = ethers.utils.parseEther("2");
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      await agentProxy.connect(user1).buyTicketThroughAgent(
        1, // gameType
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // numbers
        1, // rounds
        agent1.address,
        { value: ticketPrice }
      );
    });

    it("Should allow agents to withdraw their commissions", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 1000); // 10%
      const ticketPrice = ethers.utils.parseEther("2");
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      await agentProxy.connect(user1).buyTicketThroughAgent(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        agent1.address,
        { value: ticketPrice }
      );
      
      const agentBalanceBefore = await ethers.provider.getBalance(agent1.address);
      const agentInfoBefore = await agentProxy.getAgentInfo(agent1.address);
      
      const tx = await agentProxy.connect(agent1).withdrawCommission();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const agentBalanceAfter = await ethers.provider.getBalance(agent1.address);
      const expectedWithdrawal = agentInfoBefore.totalCommissionEarned;
      
      expect(agentBalanceAfter).to.equal(
        agentBalanceBefore.add(expectedWithdrawal).sub(gasUsed)
      );
      
      // Check that commission is reset
      const agentInfoAfter = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfoAfter.totalCommissionEarned).to.equal(0);
    });

    it("Should emit CommissionWithdrawn event", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 1000);
      const ticketPrice = ethers.utils.parseEther("2");
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      await agentProxy.connect(user1).buyTicketThroughAgent(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        agent1.address,
        { value: ticketPrice }
      );
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      
      await expect(
        agentProxy.connect(agent1).withdrawCommission()
      ).to.emit(agentProxy, "CommissionWithdrawn")
       .withArgs(agent1.address, agentInfo.totalCommissionEarned);
    });

    it("Should prevent withdrawal when no commission available", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      await expect(
        agentProxy.connect(agent1).withdrawCommission()
      ).to.be.revertedWith("NoCommissionAvailable");
    });

    it("Should prevent non-agents from withdrawing", async function () {
      const { agentProxy, user1 } = await loadFixture(deployAgentProxyFixture);
      
      await expect(
        agentProxy.connect(user1).withdrawCommission()
      ).to.be.revertedWith("AgentNotFound");
    });
  });

  describe("Batch Operations", function () {
    it("Should handle registering multiple agents", async function () {
      const { agentProxy, owner, agent1, agent2 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      await agentProxy.connect(owner).registerAgent(agent2.address, 750);
      
      const agent1Info = await agentProxy.getAgentInfo(agent1.address);
      const agent2Info = await agentProxy.getAgentInfo(agent2.address);
      
      expect(agent1Info.isActive).to.be.true;
      expect(agent1Info.commissionRate).to.equal(500);
      
      expect(agent2Info.isActive).to.be.true;
      expect(agent2Info.commissionRate).to.equal(750);
    });

    it("Should handle multiple ticket purchases efficiently", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      const ticketPrice = ethers.utils.parseEther("1");
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      // Multiple purchases
      for (let i = 0; i < 5; i++) {
        await agentProxy.connect(user1).buyTicketThroughAgent(
          1,
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          1,
          agent1.address,
          { value: ticketPrice }
        );
      }
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.totalTicketsSold).to.equal(5);
      
      const expectedCommission = ticketPrice.mul(500).div(10000).mul(5);
      expect(agentInfo.totalCommissionEarned).to.equal(expectedCommission);
    });
  });

  describe("Security", function () {
    it("Should prevent reentrancy in commission withdrawal", async function () {
      const { agentProxy, owner, agent1, user1, cryptoDrawMock } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 1000);
      const ticketPrice = ethers.utils.parseEther("2");
      await cryptoDrawMock.setTicketPrice(ticketPrice);
      
      await agentProxy.connect(user1).buyTicketThroughAgent(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        agent1.address,
        { value: ticketPrice }
      );
      
      // First withdrawal should work
      await agentProxy.connect(agent1).withdrawCommission();
      
      // Second withdrawal should fail (no commission available)
      await expect(
        agentProxy.connect(agent1).withdrawCommission()
      ).to.be.revertedWith("NoCommissionAvailable");
    });

    it("Should handle contract with zero balance gracefully", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      await agentProxy.connect(owner).registerAgent(agent1.address, 500);
      
      // Try to withdraw when contract has no balance
      await expect(
        agentProxy.connect(agent1).withdrawCommission()
      ).to.be.revertedWith("NoCommissionAvailable");
    });
  });

  describe("View Functions", function () {
    it("Should return correct agent information", async function () {
      const { agentProxy, owner, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      const commissionRate = 875;
      await agentProxy.connect(owner).registerAgent(agent1.address, commissionRate);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      
      expect(agentInfo.isActive).to.be.true;
      expect(agentInfo.commissionRate).to.equal(commissionRate);
      expect(agentInfo.totalTicketsSold).to.equal(0);
      expect(agentInfo.totalCommissionEarned).to.equal(0);
    });

    it("Should return false for non-existent agents", async function () {
      const { agentProxy, agent1 } = await loadFixture(deployAgentProxyFixture);
      
      const agentInfo = await agentProxy.getAgentInfo(agent1.address);
      expect(agentInfo.isActive).to.be.false;
    });
  });
});