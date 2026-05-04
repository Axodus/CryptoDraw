const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDraw Integration Tests (V2)", function () {
  // Full V2 system fixture
  async function deployV2Fixture() {
    const [owner, operator, agent, user1, user2, user3] = await ethers.getSigners();

    // Initial oracle: ONE = $2000 (18 decimals)
    const initialOnePrice = ethers.utils.parseEther("2000");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(initialOnePrice);

    // TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();

    // Deploy CryptoDraw V2 (fully qualified name to avoid ambiguity)
    const CryptoDraw = await ethers.getContractFactory("contracts/CryptoDrawV2.sol:CryptoDraw");
    const cryptoDraw = await CryptoDraw.deploy(
      ticketNFT.address,
      priceOracle.address,
      owner.address, // treasury
      owner.address, // prizeWallet
      owner.address, // projectFund
      owner.address, // grantFund
      owner.address  // operationFund
    );

    // Wire NFT to main contract
    await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

    // Roles
    const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
    const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
    await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
    await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

    // Enable native token support (AddressZero)
    await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);

    // Configure games: 0 = SuperSeven, 1 = EasyLotto
    await cryptoDraw.setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
    await cryptoDraw.setGameConfig(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);

    return { owner, operator, agent, user1, user2, user3, priceOracle, ticketNFT, cryptoDraw };
  }

  describe("Complete Lottery Flow - EasyLotto", function () {
    it("executes full draw cycle and finalizes with winning numbers", async function () {
      const { cryptoDraw, ticketNFT, operator, user1, user2, user3 } = await loadFixture(deployV2Fixture);

      const gameType = 1; // EASYLOTTO
      const requiredOne = ethers.utils.parseEther("0.001"); // $2 in ONE at $2000

      // Ticket purchases
      const n1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const n2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25];
      const n3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19];

      await cryptoDraw.connect(user1).buyTicket(
        gameType,
        n1,
        1,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );
      await cryptoDraw.connect(user2).buyTicket(
        gameType,
        n2,
        1,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );
      await cryptoDraw.connect(user3).buyTicket(
        gameType,
        n3,
        1,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );

      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      expect(drawId).to.equal(1);

      // Verify NFTs
      expect(await ticketNFT.ownerOf(0)).to.equal(user1.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(user2.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(user3.address);

      // Close and complete draw with manual seed
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](gameType, drawId, 123456);
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(4); // COMPLETED
      expect(draw.winningNumbersPacked).to.not.equal(0);
    });

    it("handles multi-round ticket", async function () {
      const { cryptoDraw, ticketNFT, operator, user1 } = await loadFixture(deployV2Fixture);

      const gameType = 1; // EASYLOTTO
      const rounds = 3;
      const requiredOne = ethers.utils.parseEther("0.003"); // 3 * $2 / $2000

      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      await cryptoDraw.connect(user1).buyTicket(
        gameType,
        numbers,
        rounds,
        ethers.constants.AddressZero,
        requiredOne,
        ethers.constants.AddressZero,
        { value: requiredOne }
      );

      const t = await ticketNFT.getTicket(0);
      expect(t.roundsBought).to.equal(rounds);

      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](gameType, drawId, 789);
      const after = await cryptoDraw.getDraw(gameType, drawId);
      expect(after.status).to.equal(4);
    });
  });

  describe("Agent System Integration (main contract)", function () {
    it("accrues and allows agent commission withdrawal", async function () {
      const { cryptoDraw, agent, user1 } = await loadFixture(deployV2Fixture);

      const gameType = 1;
      const requiredOne = ethers.utils.parseEther("0.001");

      await cryptoDraw.connect(user1).buyTicket(
        gameType,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        ethers.constants.AddressZero,
        requiredOne,
        agent.address,
        { value: requiredOne }
      );

      const commission = await cryptoDraw.agentCommissions(agent.address);
      expect(commission).to.be.gt(0);

      // Fund contract to enable withdrawal
      await user1.sendTransaction({ to: cryptoDraw.address, value: commission });

      const before = await ethers.provider.getBalance(agent.address);
      await cryptoDraw.connect(agent).withdrawAgentCommission();
      const after = await ethers.provider.getBalance(agent.address);
      expect(after).to.be.gt(before);
      expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
    });

    it("prevents suspended agent from earning commission", async function () {
      const { cryptoDraw, owner, agent, user1 } = await loadFixture(deployV2Fixture);

      await cryptoDraw.connect(owner).setSuspendedAgent(agent.address, true);
      const requiredOne = ethers.utils.parseEther("0.001");
      await expect(
        cryptoDraw.connect(user1).buyTicket(
          1,
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          1,
          ethers.constants.AddressZero,
          requiredOne,
          agent.address,
          { value: requiredOne }
        )
      ).to.be.reverted;
    });
  });

  describe("Multi-Game Support", function () {
    it("operates EasyLotto and SuperSeven simultaneously", async function () {
      const { cryptoDraw, operator, user1, user2 } = await loadFixture(deployV2Fixture);

      const easyRequired = ethers.utils.parseEther("0.001"); // $2
      const superRequired = ethers.utils.parseEther("0.0005"); // $1

      await cryptoDraw.connect(user1).buyTicket(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        ethers.constants.AddressZero,
        easyRequired,
        ethers.constants.AddressZero,
        { value: easyRequired }
      );
      await cryptoDraw.connect(user2).buyTicket(
        0,
        [1, 2, 3, 4, 5, 6, 7],
        1,
        ethers.constants.AddressZero,
        superRequired,
        ethers.constants.AddressZero,
        { value: superRequired }
      );

      const easyDrawId = await cryptoDraw.getCurrentDrawId(1);
      const superDrawId = await cryptoDraw.getCurrentDrawId(0);

      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](1, easyDrawId, 111);
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, superDrawId, 222);

      const easy = await cryptoDraw.getDraw(1, easyDrawId);
      const sup = await cryptoDraw.getDraw(0, superDrawId);
      expect(easy.status).to.equal(4);
      expect(sup.status).to.equal(4);
    });
  });

  describe("Prize Distribution Integration", function () {
    it("closes draw with multiple tickets without reverting", async function () {
      const { cryptoDraw, operator, user1, user2, user3 } = await loadFixture(deployV2Fixture);

      const gameType = 1;
      const required = ethers.utils.parseEther("0.001");

      await cryptoDraw.connect(user1).buyTicket(
        gameType,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        ethers.constants.AddressZero,
        required,
        ethers.constants.AddressZero,
        { value: required }
      );
      await cryptoDraw.connect(user2).buyTicket(
        gameType,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 25],
        1,
        ethers.constants.AddressZero,
        required,
        ethers.constants.AddressZero,
        { value: required }
      );
      await cryptoDraw.connect(user3).buyTicket(
        gameType,
        [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 1, 2, 3, 4, 5],
        1,
        ethers.constants.AddressZero,
        required,
        ethers.constants.AddressZero,
        { value: required }
      );

      const drawId = await cryptoDraw.getCurrentDrawId(gameType);
      await expect(
        cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](gameType, drawId, 333)
      ).to.not.be.reverted;
      const d = await cryptoDraw.getDraw(gameType, drawId);
      expect(d.status).to.equal(4);
    });
  });

  describe("Security Integration Tests", function () {
    it("prevents unauthorized access to closing draw", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      await expect(
        cryptoDraw.connect(user1)['closeDraw(uint8,uint32,uint256)'](1, 1, 1)
      ).to.be.reverted;
    });

    it("respects paused state when buying ticket", async function () {
      const { cryptoDraw, owner, user1 } = await loadFixture(deployV2Fixture);
      await cryptoDraw.connect(owner).pause();
      const required = ethers.utils.parseEther("0.001");
      await expect(
        cryptoDraw.connect(user1).buyTicket(
          1,
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          1,
          ethers.constants.AddressZero,
          required,
          ethers.constants.AddressZero,
          { value: required }
        )
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("uses reasonable gas for ticket purchase", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      const required = ethers.utils.parseEther("0.001");
      const tx = await cryptoDraw.connect(user1).buyTicket(
        1,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        1,
        ethers.constants.AddressZero,
        required,
        ethers.constants.AddressZero,
        { value: required }
      );
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(500000);
    });

    it("keeps average gas consistent across multiple purchases", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      const required = ethers.utils.parseEther("0.001");
      const uses = [];
      for (let i = 0; i < 3; i++) {
        const tx = await cryptoDraw.connect(user1).buyTicket(
          1,
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          1,
          ethers.constants.AddressZero,
          required,
          ethers.constants.AddressZero,
          { value: required }
        );
        const rc = await tx.wait();
        uses.push(rc.gasUsed);
      }
      const avg = uses.reduce((a, b) => a.add(b)).div(uses.length);
      expect(avg).to.be.lt(500000);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("reverts when closing with invalid drawId", async function () {
      const { cryptoDraw, operator } = await loadFixture(deployV2Fixture);
      // No draw created yet for SuperSeven (0)
      await expect(
        cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, 1, 1)
      ).to.be.reverted;
    });

    it("reverts purchase with invalid numbers", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      const required = ethers.utils.parseEther("0.001");
      await expect(
        cryptoDraw.connect(user1).buyTicket(
          0,
          [1, 2, 3], // SuperSeven requires exactly 7 numbers
          1,
          ethers.constants.AddressZero,
          required,
          ethers.constants.AddressZero,
          { value: required }
        )
      ).to.be.reverted;
    });
  });
});