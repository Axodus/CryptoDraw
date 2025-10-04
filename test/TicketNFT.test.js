const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TicketNFT - Coverage", function () {
  let TicketNFT, ticketNFT, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();
  });

  it("should mint and provide tokenURI and enforce soulbound restrictions", async function () {
    // Configure a fake CryptoDraw caller (helper) as the onlyCryptoDraw address
    const TestTicketNFCCaller = await ethers.getContractFactory("TestTicketNFCCaller");
    const helper = await TestTicketNFCCaller.deploy(ticketNFT.address);
    await ticketNFT.setCryptoDrawAddress(helper.address);

    // We need a contract at helper that can call mint; since helper doesn't mint, simulate by using owner temporarily
    // NOTE: TicketNFT.mint is onlyCryptoDraw; to mint for the test, we'll temporarily set cryptoDrawAddress to owner, mint, then set back to helper
    await ticketNFT.setCryptoDrawAddress(owner.address);
  // capture next tokenId via callStatic
  const nextId = await ticketNFT.callStatic.mint(addr1.address, 1, 100, 1, 1);
  await ticketNFT.mint(addr1.address, 1, 100, 1, 1);
    await ticketNFT.setCryptoDrawAddress(helper.address);

  const balance = await ticketNFT.balanceOf(addr1.address);
    expect(balance).to.equal(1);

  const tokenId = nextId.toString();
  expect(await ticketNFT.tokenURI(tokenId)).to.be.a("string");

    // soulbound: transfers should revert
    await expect(
      ticketNFT.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId)
    ).to.be.reverted;
  });

  it("should allow only configured cryptoDraw address to call restricted functions", async function () {
    // deploy helper that will act as CryptoDraw
    const TestTicketNFCCaller = await ethers.getContractFactory("TestTicketNFCCaller");
    const helper = await TestTicketNFCCaller.deploy(ticketNFT.address);

    // owner sets helper as cryptoDraw address
    await ticketNFT.setCryptoDrawAddress(helper.address);

  // mint a token via onlyCryptoDraw: temporarily set to owner to mint
  await ticketNFT.setCryptoDrawAddress(owner.address);
  const tid = await ticketNFT.callStatic.mint(owner.address, 1, 100, 1, 1);
  await ticketNFT.mint(owner.address, 1, 100, 1, 1);
  await ticketNFT.setCryptoDrawAddress(helper.address);
  const tokenId = tid.toString();

    // helper can call decrementRounds (onlyCryptoDraw)
    await helper.callDecrement(tokenId);
    await helper.callUpdate(tokenId, 2);
    await helper.callBurn(tokenId);

    expect(await ticketNFT.balanceOf(owner.address)).to.equal(0);
  });

  it("should expose status changes and round decrements properly", async function () {
  await ticketNFT.setCryptoDrawAddress(owner.address);
  const tid2 = await ticketNFT.callStatic.mint(owner.address, 1, 100, 1, 3);
  await ticketNFT.mint(owner.address, 1, 100, 1, 3);
  const tokenId = tid2.toString();
  const ticketBefore = await ticketNFT.getTicket(tokenId);
  expect(ticketBefore.roundsRemaining).to.equal(3);

    const TestTicketNFCCaller = await ethers.getContractFactory("TestTicketNFCCaller");
    const helper = await TestTicketNFCCaller.deploy(ticketNFT.address);
    await ticketNFT.setCryptoDrawAddress(helper.address);

    await helper.callDecrement(tokenId);
  const ticketMid = await ticketNFT.getTicket(tokenId);
  expect(ticketMid.roundsRemaining).to.equal(2);
  await helper.callUpdate(tokenId, 2); // TicketStatus.REDEEMED
  const status = await ticketNFT.getTicketStatus(tokenId);
  expect(status).to.equal(2);
  });
});

describe("TicketNFT Contract (aligned with current API)", function () {
  async function deployTicketNFTFixture() {
    const [owner, cryptoDraw, user1, user2, attacker] = await ethers.getSigners();
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();
    return { ticketNFT, owner, cryptoDraw, user1, user2, attacker };
  }

  describe("Deployment", function () {
    it("sets owner and metadata", async function () {
      const { ticketNFT, owner } = await loadFixture(deployTicketNFTFixture);
      expect(await ticketNFT.owner()).to.equal(owner.address);
      expect(await ticketNFT.name()).to.equal("CryptoDraw Ticket");
      expect(await ticketNFT.symbol()).to.equal("CDRAW");
    });
  });

  describe("Access control: onlyCryptoDraw", function () {
    it("owner can set CryptoDraw address", async function () {
      const { ticketNFT, owner, cryptoDraw } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);
  // No event is emitted; validate by calling a restricted function
      await expect(
        ticketNFT.connect(cryptoDraw).mint(cryptoDraw.address, 1, 12345, 1, 1)
      ).to.not.be.reverted;
    });

    it("non-owner cannot set CryptoDraw address", async function () {
      const { ticketNFT, user1, cryptoDraw } = await loadFixture(deployTicketNFTFixture);
      await expect(
        ticketNFT.connect(user1).setCryptoDrawAddress(cryptoDraw.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Minting", function () {
    it("only CryptoDraw can mint", async function () {
      const { ticketNFT, owner, cryptoDraw, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);

      await expect(
        ticketNFT.connect(user1).mint(user1.address, 1, 12345, 1, 1)
      ).to.be.reverted; // onlyCryptoDraw

      await ticketNFT.connect(cryptoDraw).mint(user1.address, 1, 12345, 1, 1);
      expect(await ticketNFT.ownerOf(0)).to.equal(user1.address);
    });

    it("stores ticket data correctly", async function () {
      const { ticketNFT, owner, cryptoDraw, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);

      await ticketNFT.connect(cryptoDraw).mint(user1.address, 1, 12345, 10, 5);
      const t = await ticketNFT.getTicket(0);
      expect(t.player).to.equal(user1.address);
      expect(t.game).to.equal(1);
      expect(t.numbersPacked).to.equal(12345);
      expect(t.drawRound).to.equal(10);
      expect(t.roundsBought).to.equal(5);
      expect(t.roundsRemaining).to.equal(5);
    });
  });

  describe("Soulbound behavior (no transfers)", function () {
    it("transfers revert", async function () {
      const { ticketNFT, owner, cryptoDraw, user1, user2 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);
      await ticketNFT.connect(cryptoDraw).mint(user1.address, 1, 12345, 1, 1);

      await expect(
        ticketNFT.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.reverted; // TransferNotAllowed
    });
  });

  describe("Burning", function () {
    it("only CryptoDraw can burn", async function () {
      const { ticketNFT, owner, cryptoDraw, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);
      await ticketNFT.connect(cryptoDraw).mint(user1.address, 1, 12345, 1, 1);

      await expect(ticketNFT.connect(user1).burn(0)).to.be.reverted; // onlyCryptoDraw
      await expect(ticketNFT.connect(cryptoDraw).burn(0)).to.not.be.reverted;
    });
  });

  describe("Token URI", function () {
    it("returns base64 JSON URI", async function () {
      const { ticketNFT, owner, cryptoDraw, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setCryptoDrawAddress(cryptoDraw.address);
      await ticketNFT.connect(cryptoDraw).mint(user1.address, 1, 12345, 1, 1);
      const uri = await ticketNFT.tokenURI(0);
      expect(uri).to.include("data:application/json;base64,");
    });
  });
});