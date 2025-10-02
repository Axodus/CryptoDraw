const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketNFT Contract", function () {
  let ticketNFT, owner, minter, user1, user2, attacker;

  beforeEach(async function () {
    [owner, minter, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy TicketNFT
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ticketNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct initial settings", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);
      
      expect(await ticketNFT.name()).to.equal("CryptoDraw Ticket");
      expect(await ticketNFT.symbol()).to.equal("CDT");
      expect(await ticketNFT.totalSupply()).to.equal(0);
    });

    it("Should start with no minter set", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);
      expect(await ticketNFT.minter()).to.equal(ethers.constants.AddressZero);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to set minter", async function () {
      const { ticketNFT, owner, minter } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      expect(await ticketNFT.minter()).to.equal(minter.address);
    });

    it("Should emit MinterSet event", async function () {
      const { ticketNFT, owner, minter } = await loadFixture(deployTicketNFTFixture);
      
      await expect(ticketNFT.connect(owner).setMinter(minter.address))
        .to.emit(ticketNFT, "MinterSet")
        .withArgs(minter.address);
    });

    it("Should prevent non-owner from setting minter", async function () {
      const { ticketNFT, user1, minter } = await loadFixture(deployTicketNFTFixture);
      
      await expect(
        ticketNFT.connect(user1).setMinter(minter.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to change minter", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      await ticketNFT.connect(owner).setMinter(user1.address);
      
      expect(await ticketNFT.minter()).to.equal(user1.address);
    });

    it("Should allow setting minter to zero address", async function () {
      const { ticketNFT, owner, minter } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      await ticketNFT.connect(owner).setMinter(ethers.constants.AddressZero);
      
      expect(await ticketNFT.minter()).to.equal(ethers.constants.AddressZero);
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint ticket", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1; // LOTOFACIL
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      const tx = await ticketNFT.connect(minter).mintTicket(
        user1.address,
        gameType,
        drawId,
        numbers,
        rounds
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "Transfer");
      
      expect(event).to.not.be.undefined;
      expect(event.args.to).to.equal(user1.address);
      expect(event.args.tokenId).to.equal(1);
      
      // Verify ownership
      expect(await ticketNFT.ownerOf(1)).to.equal(user1.address);
      expect(await ticketNFT.balanceOf(user1.address)).to.equal(1);
      expect(await ticketNFT.totalSupply()).to.equal(1);
    });

    it("Should store ticket data correctly", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 2; // SUPERSETE
      const drawId = 5;
      const numbers = [1, 2, 3, 4, 5, 6, 7];
      const rounds = 3;
      
      await ticketNFT.connect(minter).mintTicket(
        user1.address,
        gameType,
        drawId,
        numbers,
        rounds
      );
      
      const ticket = await ticketNFT.getTicket(1);
      
      expect(ticket.gameType).to.equal(gameType);
      expect(ticket.drawId).to.equal(drawId);
      expect(ticket.rounds).to.equal(rounds);
      expect(ticket.numbers.length).to.equal(numbers.length);
      
      for (let i = 0; i < numbers.length; i++) {
        expect(ticket.numbers[i]).to.equal(numbers[i]);
      }
    });

    it("Should increment token ID correctly", async function () {
      const { ticketNFT, owner, minter, user1, user2 } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      // Mint first ticket
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      expect(await ticketNFT.ownerOf(1)).to.equal(user1.address);
      
      // Mint second ticket
      await ticketNFT.connect(minter).mintTicket(user2.address, gameType, drawId, numbers, rounds);
      expect(await ticketNFT.ownerOf(2)).to.equal(user2.address);
      
      expect(await ticketNFT.totalSupply()).to.equal(2);
    });

    it("Should prevent non-minter from minting", async function () {
      const { ticketNFT, owner, user1, attacker } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(user1.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await expect(
        ticketNFT.connect(attacker).mintTicket(attacker.address, gameType, drawId, numbers, rounds)
      ).to.be.revertedWith("OnlyMinter");
    });

    it("Should prevent minting when no minter is set", async function () {
      const { ticketNFT, owner, user1 } = await loadFixture(deployTicketNFTFixture);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await expect(
        ticketNFT.connect(owner).mintTicket(user1.address, gameType, drawId, numbers, rounds)
      ).to.be.revertedWith("OnlyMinter");
    });

    it("Should prevent minting to zero address", async function () {
      const { ticketNFT, owner, minter } = await loadFixture(deployTicketNFTFixture);
      
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await expect(
        ticketNFT.connect(minter).mintTicket(
          ethers.constants.AddressZero, 
          gameType, 
          drawId, 
          numbers, 
          rounds
        )
      ).to.be.revertedWith("ERC721: mint to the zero address");
    });
  });

  describe("Token Data Retrieval", function () {
    beforeEach(async function () {
      const { ticketNFT, owner, minter } = this;
      await ticketNFT.connect(owner).setMinter(minter.address);
    });

    it("Should return correct ticket data", async function () {
      const { ticketNFT, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 10;
      const numbers = [5, 10, 15, 20, 25, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12];
      const rounds = 5;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      const ticket = await ticketNFT.getTicket(1);
      
      expect(ticket.gameType).to.equal(gameType);
      expect(ticket.drawId).to.equal(drawId);
      expect(ticket.rounds).to.equal(rounds);
      expect(ticket.numbers).to.deep.equal(numbers);
    });

    it("Should revert when querying non-existent token", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);
      
      await expect(ticketNFT.getTicket(999)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Should handle multiple tickets with different data", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      // First ticket - Lotofácil
      const gameType1 = 1;
      const drawId1 = 1;
      const numbers1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds1 = 1;
      
      // Second ticket - SuperSete
      const gameType2 = 2;
      const drawId2 = 2;
      const numbers2 = [0, 1, 2, 3, 4, 5, 6];
      const rounds2 = 2;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType1, drawId1, numbers1, rounds1);
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType2, drawId2, numbers2, rounds2);
      
      const ticket1 = await ticketNFT.getTicket(1);
      const ticket2 = await ticketNFT.getTicket(2);
      
      expect(ticket1.gameType).to.equal(gameType1);
      expect(ticket1.numbers).to.deep.equal(numbers1);
      
      expect(ticket2.gameType).to.equal(gameType2);
      expect(ticket2.numbers).to.deep.equal(numbers2);
    });
  });

  describe("ERC721 Standard Compliance", function () {
    beforeEach(async function () {
      const { ticketNFT, owner, minter, user1 } = this;
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      // Mint a test ticket
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
    });

    it("Should support ERC721 interface", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);
      
      const ERC721InterfaceId = "0x80ac58cd";
      expect(await ticketNFT.supportsInterface(ERC721InterfaceId)).to.be.true;
    });

    it("Should allow approved transfers", async function () {
      const { ticketNFT, owner, minter, user1, user2 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      // Approve transfer
      await ticketNFT.connect(user1).approve(user2.address, 1);
      expect(await ticketNFT.getApproved(1)).to.equal(user2.address);
      
      // Transfer
      await ticketNFT.connect(user2).transferFrom(user1.address, user2.address, 1);
      expect(await ticketNFT.ownerOf(1)).to.equal(user2.address);
    });

    it("Should allow operator transfers", async function () {
      const { ticketNFT, owner, minter, user1, user2 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      // Set approval for all
      await ticketNFT.connect(user1).setApprovalForAll(user2.address, true);
      expect(await ticketNFT.isApprovedForAll(user1.address, user2.address)).to.be.true;
      
      // Transfer
      await ticketNFT.connect(user2).transferFrom(user1.address, user2.address, 1);
      expect(await ticketNFT.ownerOf(1)).to.equal(user2.address);
    });

    it("Should prevent unauthorized transfers", async function () {
      const { ticketNFT, owner, minter, user1, user2, attacker } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      await expect(
        ticketNFT.connect(attacker).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });
  });

  describe("Token URI", function () {
    it("Should have a token URI function", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      // Should not revert
      await expect(ticketNFT.tokenURI(1)).to.not.be.reverted;
    });

    it("Should revert for non-existent token URI", async function () {
      const { ticketNFT } = await loadFixture(deployTicketNFTFixture);
      
      await expect(ticketNFT.tokenURI(999)).to.be.revertedWith("ERC721: invalid token ID");
    });
  });

  describe("Batch Operations", function () {
    it("Should handle multiple mints efficiently", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      // Mint multiple tickets
      for (let i = 0; i < 10; i++) {
        await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      }
      
      expect(await ticketNFT.balanceOf(user1.address)).to.equal(10);
      expect(await ticketNFT.totalSupply()).to.equal(10);
    });

    it("Should maintain unique token IDs across batch mints", async function () {
      const { ticketNFT, owner, minter, user1, user2 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      // Mint to different users
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      await ticketNFT.connect(minter).mintTicket(user2.address, gameType, drawId, numbers, rounds);
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      expect(await ticketNFT.ownerOf(1)).to.equal(user1.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(user2.address);
      expect(await ticketNFT.ownerOf(3)).to.equal(user1.address);
      
      expect(await ticketNFT.balanceOf(user1.address)).to.equal(2);
      expect(await ticketNFT.balanceOf(user2.address)).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty numbers array", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = []; // Empty array
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      const ticket = await ticketNFT.getTicket(1);
      expect(ticket.numbers.length).to.equal(0);
    });

    it("Should handle zero rounds", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 0; // Zero rounds
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      const ticket = await ticketNFT.getTicket(1);
      expect(ticket.rounds).to.equal(0);
    });

    it("Should handle large numbers in array", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [999, 1000, 9999]; // Large numbers
      const rounds = 1;
      
      await ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds);
      
      const ticket = await ticketNFT.getTicket(1);
      expect(ticket.numbers).to.deep.equal(numbers);
    });
  });

  describe("Events", function () {
    it("Should emit Transfer event on mint", async function () {
      const { ticketNFT, owner, minter, user1 } = await loadFixture(deployTicketNFTFixture);
      await ticketNFT.connect(owner).setMinter(minter.address);
      
      const gameType = 1;
      const drawId = 1;
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rounds = 1;
      
      await expect(
        ticketNFT.connect(minter).mintTicket(user1.address, gameType, drawId, numbers, rounds)
      ).to.emit(ticketNFT, "Transfer")
       .withArgs(ethers.constants.AddressZero, user1.address, 1);
    });

    it("Should emit MinterSet event when setting minter", async function () {
      const { ticketNFT, owner, minter } = await loadFixture(deployTicketNFTFixture);
      
      await expect(
        ticketNFT.connect(owner).setMinter(minter.address)
      ).to.emit(ticketNFT, "MinterSet")
       .withArgs(minter.address);
    });
  });
});