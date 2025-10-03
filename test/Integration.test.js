const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoDraw Integration Tests (V2)", function () {
  // Fixture V2 completa do sistema
  async function deployV2Fixture() {
    const [owner, operator, agent, user1, user2, user3] = await ethers.getSigners();

    // Oracle inicial: ONE = $2000 (18 dec)
    const initialOnePrice = ethers.utils.parseEther("2000");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(initialOnePrice);

    // TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();

    // Deploy CryptoDraw V2 (nome qualificado para evitar ambiguidade)
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

    // Wiring
    await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

    // Roles
    const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
    const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
    await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
    await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

    // Suporte ao token nativo
    await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);

    // Configuração dos jogos: 0=SuperSeven, 1=EasyLotto
    await cryptoDraw.setGameConfig(0, ethers.utils.parseEther("1"), 24 * 60 * 60, true);
    await cryptoDraw.setGameConfig(1, ethers.utils.parseEther("2"), 7 * 24 * 60 * 60, true);

    return { owner, operator, agent, user1, user2, user3, priceOracle, ticketNFT, cryptoDraw };
  }

  describe("Complete Lottery Flow - EasyLotto", function () {
    it("executa ciclo completo do sorteio e finaliza com números vencedores", async function () {
      const { cryptoDraw, ticketNFT, operator, user1, user2, user3 } = await loadFixture(deployV2Fixture);

      const gameType = 1; // EASYLOTTO
      const requiredOne = ethers.utils.parseEther("0.001"); // $2 em ONE a $2000

      // Compras de bilhetes
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

      // Verifica NFTs
      expect(await ticketNFT.ownerOf(0)).to.equal(user1.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(user2.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(user3.address);

      // Fecha e completa sorteio com seed manual
      await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](gameType, drawId, 123456);
      const draw = await cryptoDraw.getDraw(gameType, drawId);
      expect(draw.status).to.equal(4); // COMPLETED
      expect(draw.winningNumbersPacked).to.not.equal(0);
    });

    it("lida com bilhete multi-rodadas", async function () {
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
    it("acumula e permite saque de comissão do agente", async function () {
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

      // Garantir saldo para saque
      await user1.sendTransaction({ to: cryptoDraw.address, value: commission });

      const before = await ethers.provider.getBalance(agent.address);
      await cryptoDraw.connect(agent).withdrawAgentCommission();
      const after = await ethers.provider.getBalance(agent.address);
      expect(after).to.be.gt(before);
      expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
    });

    it("bloqueia agente suspenso de ganhar comissão", async function () {
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
    it("opera EasyLotto e SuperSeven simultaneamente", async function () {
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
    it("fecha sorteio com múltiplos bilhetes sem reverter", async function () {
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
    it("previne acesso não autorizado ao fechamento de sorteio", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      await expect(
        cryptoDraw.connect(user1)['closeDraw(uint8,uint32,uint256)'](1, 1, 1)
      ).to.be.reverted;
    });

    it("respeita estado pausado ao comprar bilhete", async function () {
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
    it("usa gas razoável na compra de bilhete", async function () {
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

    it("mantém média de gas consistente em compras múltiplas", async function () {
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
    it("reverte ao fechar com drawId inválido", async function () {
      const { cryptoDraw, operator } = await loadFixture(deployV2Fixture);
      // Nenhum sorteio criado ainda para SuperSeven (0)
      await expect(
        cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, 1, 1)
      ).to.be.reverted;
    });

    it("reverte compra com números inválidos", async function () {
      const { cryptoDraw, user1 } = await loadFixture(deployV2Fixture);
      const required = ethers.utils.parseEther("0.001");
      await expect(
        cryptoDraw.connect(user1).buyTicket(
          0,
          [1, 2, 3], // SuperSeven exige 7 números
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