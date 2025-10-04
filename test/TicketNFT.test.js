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

// ===== Merged from test/v2/TicketNFT* (extended coverage) =====
describe("TicketNFT - Extended Coverage (merged)", function () {
  let ticketNFT, owner, user1, user2, minter;

  beforeEach(async function () {
    [owner, user1, user2, minter] = await ethers.getSigners();
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();
    // set a dedicated minter as CryptoDraw contract address
    await ticketNFT.setCryptoDrawAddress(minter.address);
  });

  it("reverts when minting to zero address", async function () {
    await expect(
      ticketNFT.connect(minter).mint(ethers.constants.AddressZero, 0, 12345, 1, 1)
    ).to.be.revertedWith("Invalid recipient");
  });

  it("accepts rounds at boundaries and rejects invalid ones", async function () {
    await expect(ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).to.not.be.reverted;
    await expect(ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 6)).to.not.be.reverted;
    await expect(ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 0)).to.be.revertedWith("Invalid rounds count");
    await expect(ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 7)).to.be.revertedWith("Invalid rounds count");
  });

  it("mints with large drawRound values", async function () {
    const maxUint256 = ethers.constants.MaxUint256;
    await expect(ticketNFT.connect(minter).mint(user1.address, 0, 12345, maxUint256, 1)).to.not.be.reverted;
  });

  it("increments token IDs sequentially", async function () {
    const r1 = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).wait();
    const id1 = r1.events.find(e => e.event === 'TicketMinted').args.tokenId;
    const r2 = await (await ticketNFT.connect(minter).mint(user1.address, 0, 54321, 1, 1)).wait();
    const id2 = r2.events.find(e => e.event === 'TicketMinted').args.tokenId;
    expect(id2).to.equal(id1.add(1));
  });

  it("getTicket returns full info and reverts for non-existent", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 1, 11111, 10, 5)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    const t = await ticketNFT.getTicket(id);
    expect(t.player).to.equal(user1.address);
    expect(t.game).to.equal(1);
    expect(t.numbersPacked).to.equal(11111);
    expect(t.drawRound).to.equal(10);
    expect(t.roundsBought).to.equal(5);
    expect(t.roundsRemaining).to.equal(5);
    expect(t.status).to.equal(0);
    await expect(ticketNFT.getTicket(999999)).to.be.revertedWithCustomError(ticketNFT, 'TokenNotExists');
  });

  it("updateStatus emits event and handles all statuses", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    await expect(ticketNFT.connect(minter).updateStatus(id, 2)).to.emit(ticketNFT, 'TicketStatusUpdated');
    for (let s = 0; s <= 3; s++) {
      await ticketNFT.connect(minter).updateStatus(id, s);
      const t = await ticketNFT.getTicket(id);
      expect(t.status).to.equal(s);
    }
    await expect(ticketNFT.connect(minter).updateStatus(999999, 1)).to.be.revertedWithCustomError(ticketNFT, 'TokenNotExists');
  });

  it("burn emits event and reverts on invalid token", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    await expect(ticketNFT.connect(minter).burn(id)).to.emit(ticketNFT, 'TicketBurned');
    await expect(ticketNFT.ownerOf(id)).to.be.revertedWith('ERC721: invalid token ID');
    await expect(ticketNFT.connect(minter).burn(999999)).to.be.revertedWithCustomError(ticketNFT, 'TokenNotExists');
    await expect(ticketNFT.connect(minter).burn(id)).to.be.revertedWithCustomError(ticketNFT, 'TokenNotExists');
  });

  it("decrementRounds down to zero then reverts beyond", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 2)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    await ticketNFT.connect(minter).decrementRounds(id);
    await ticketNFT.connect(minter).decrementRounds(id);
    const t = await ticketNFT.getTicket(id);
    expect(t.roundsRemaining).to.equal(0);
    expect(t.status).to.equal(1); // EXPIRED
    await expect(ticketNFT.connect(minter).decrementRounds(id)).to.be.revertedWith('No rounds remaining');
  });

  it("user ticket balances tracked across multiple mints", async function () {
    await ticketNFT.connect(minter).mint(user1.address, 0, 1, 1, 1);
    await ticketNFT.connect(minter).mint(user1.address, 1, 2, 2, 2);
    await ticketNFT.connect(minter).mint(user2.address, 0, 3, 1, 1);
    expect(await ticketNFT.balanceOf(user1.address)).to.equal(2);
    expect(await ticketNFT.balanceOf(user2.address)).to.equal(1);
  });

  it("tokenURI encodes JSON and reflects status changes", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;

    const uriActive = await ticketNFT.tokenURI(id);
    const base64Active = uriActive.split(',')[1];
    const jsonActive = Buffer.from(base64Active, 'base64').toString('utf8');
    expect(jsonActive).to.include('#');

    await ticketNFT.connect(minter).updateStatus(id, 1);
    const uriExpired = await ticketNFT.tokenURI(id);
    const jsonExpired = Buffer.from(uriExpired.split(',')[1], 'base64').toString('utf8');
    expect(jsonExpired).to.include('Expired');

    await ticketNFT.connect(minter).updateStatus(id, 2);
    const uriRedeemed = await ticketNFT.tokenURI(id);
    const jsonRedeemed = Buffer.from(uriRedeemed.split(',')[1], 'base64').toString('utf8');
    expect(jsonRedeemed).to.include('Redeemed');

    // Burned token should revert on tokenURI
    const r2 = await (await ticketNFT.connect(minter).mint(user1.address, 0, 54321, 1, 1)).wait();
    const id2 = r2.events.find(e => e.event === 'TicketMinted').args.tokenId;
    await ticketNFT.connect(minter).burn(id2);
    await expect(ticketNFT.tokenURI(id2)).to.be.reverted;
  });

  it("isTicketActive returns true only when ACTIVE and roundsRemaining > 0", async function () {
    await ticketNFT.setCryptoDrawAddress(minter.address);
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 111, 1, 2)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    // Initially ACTIVE with roundsRemaining=2 => true
    expect(await ticketNFT.isTicketActive(id)).to.equal(true);
    // Decrement rounds to 1 -> still true
    const Helper = await ethers.getContractFactory('TestTicketNFCCaller');
    const helper = await Helper.deploy(ticketNFT.address);
    await ticketNFT.setCryptoDrawAddress(helper.address);
    await helper.callDecrement(id);
    expect(await ticketNFT.isTicketActive(id)).to.equal(true);
    // Decrement to 0 triggers EXPIRED and active=false
    await helper.callDecrement(id);
    expect(await ticketNFT.isTicketActive(id)).to.equal(false);
    // If status changed to REDEEMED, still false
    await helper.callUpdate(id, 2);
    expect(await ticketNFT.isTicketActive(id)).to.equal(false);
  });

  it("transferFrom reverts with custom error TransferNotAllowed", async function () {
    const r = await (await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)).wait();
    const id = r.events.find(e => e.event === 'TicketMinted').args.tokenId;
    await expect(ticketNFT.connect(user1).transferFrom(user1.address, user2.address, id)).to.be.revertedWithCustomError(ticketNFT, 'TransferNotAllowed');
    await ticketNFT.connect(user1).approve(user2.address, id);
    await expect(ticketNFT.connect(user2).transferFrom(user1.address, user2.address, id)).to.be.revertedWithCustomError(ticketNFT, 'TransferNotAllowed');
  });

  it("supports ERC721 interface id", async function () {
    expect(await ticketNFT.supportsInterface('0x80ac58cd')).to.be.true;
  });
});