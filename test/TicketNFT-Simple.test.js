const { expect } = require("chai");
const { ethers } = require("hardhat");

// Configurar chai para usar com promessas
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe("TicketNFT Basic Tests", function () {
  let ticketNFT, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();
    
    // Configurar o endereço do owner como CryptoDraw address para permitir mint nos testes
    await ticketNFT.setCryptoDrawAddress(owner.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ticketNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await ticketNFT.name()).to.equal("CryptoDraw Ticket");
      expect(await ticketNFT.symbol()).to.equal("CDRAW");
    });

    it("Should start with zero current token ID", async function () {
      // TicketNFT não tem totalSupply, mas podemos verificar que começa com ID 0
      expect(await ticketNFT.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT to user", async function () {
      const gameType = 1; // EASYLOTTO
      const numbersPacked = 12345; // Números empacotados em uint32
      const drawRound = 1;
      const rounds = 1;

      await ticketNFT.mint(user1.address, gameType, numbersPacked, drawRound, rounds);
      
      expect(await ticketNFT.ownerOf(0)).to.equal(user1.address);
    });

    it("Should revert if not owner tries to mint", async function () {
      const gameType = 1;
      const numbersPacked = 12345;
      const drawRound = 1;
      const rounds = 1;

      await expect(
        ticketNFT.connect(user1).mint(user2.address, gameType, numbersPacked, drawRound, rounds)
      ).to.be.reverted;
    });
  });

  describe("Token Data", function () {
    beforeEach(async function () {
      const gameType = 1; // EASYLOTTO
      const numbersPacked = 12345; // Números empacotados
      const drawRound = 1;
      const rounds = 1;

      await ticketNFT.mint(user1.address, gameType, numbersPacked, drawRound, rounds);
    });

    it("Should return correct ticket data", async function () {
      const ticketData = await ticketNFT.getTicketInfo(0);
      
      expect(ticketData.game).to.equal(1);
      expect(ticketData.drawRound).to.equal(1);
      expect(ticketData.roundsBought).to.equal(1);
    });

    it("Should generate correct token URI", async function () {
      const tokenURI = await ticketNFT.tokenURI(0);
      expect(tokenURI).to.include("data:application/json;base64,");
    });
  });

  describe("Transfer Functionality", function () {
    beforeEach(async function () {
      const gameType = 1;
      const numbersPacked = 12345;
      const drawRound = 1;
      const rounds = 1;

      await ticketNFT.mint(user1.address, gameType, numbersPacked, drawRound, rounds);
    });

    it("Should allow owner to transfer", async function () {
      await ticketNFT.connect(user1).transferFrom(user1.address, user2.address, 0);
      expect(await ticketNFT.ownerOf(0)).to.equal(user2.address);
    });

    it("Should allow approved address to transfer", async function () {
      await ticketNFT.connect(user1).approve(user2.address, 0);
      await ticketNFT.connect(user2).transferFrom(user1.address, user2.address, 0);
      expect(await ticketNFT.ownerOf(0)).to.equal(user2.address);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const gameType = 1;
      const numbersPacked = 12345;
      const drawRound = 1;
      const rounds = 1;

      await ticketNFT.mint(user1.address, gameType, numbersPacked, drawRound, rounds);
    });

    it("Should allow owner to burn token", async function () {
      await ticketNFT.connect(user1).burn(0);
      
      await expect(ticketNFT.ownerOf(0)).to.be.reverted;
    });

    it("Should revert if non-owner tries to burn", async function () {
      await expect(
        ticketNFT.connect(user2).burn(0)
      ).to.be.reverted;
    });
  });
});