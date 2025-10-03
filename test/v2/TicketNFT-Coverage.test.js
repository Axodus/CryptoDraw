/**
 * @title TicketNFT Coverage Tests
 * @dev Comprehensive tests for modifiers, edge cases, and error conditions
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketNFT - Coverage Tests", function () {
    let ticketNFT;
    let owner, user1, user2, minter, operator;

    beforeEach(async function () {
        [owner, user1, user2, minter, operator] = await ethers.getSigners();

        // Deploy TicketNFT
        const TicketNFT = await ethers.getContractFactory("TicketNFT");
        ticketNFT = await TicketNFT.deploy();

        // Setup permissions - TicketNFT uses onlyCryptoDraw and onlyOwner
        await ticketNFT.setCryptoDrawAddress(minter.address); // minter acts as CryptoDraw contract
    });

    describe("Access Control - onlyCryptoDraw modifier", function () {
        it("should revert when non-CryptoDraw calls mint", async function () {
            await expect(
                ticketNFT.connect(user1).mint(user1.address, 0, 12345, 1, 1)
            ).to.be.revertedWithCustomError(ticketNFT, "OnlyCryptoDrawContract");
        });

        it("should revert when non-owner calls owner functions", async function () {
            await expect(
                ticketNFT.connect(user1).setCryptoDrawAddress(user1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should allow CryptoDraw to mint", async function () {
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)
            ).to.not.be.reverted;
        });

        it("should allow CryptoDraw to update status and burn", async function () {
            await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);

            await expect(
                ticketNFT.connect(minter).updateStatus(1, 1)
            ).to.not.be.reverted;

            await expect(
                ticketNFT.connect(minter).burn(1)
            ).to.not.be.reverted;
        });
    });

    describe("Minting Edge Cases", function () {
        it("should revert when minting to zero address", async function () {
            await expect(
                ticketNFT.connect(minter).mint(ethers.constants.AddressZero, 0, 12345, 1, 1)
            ).to.be.revertedWith("ERC721: mint to the zero address");
        });

        it("should handle different game types", async function () {
            // SUPERSEVEN
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)
            ).to.not.be.reverted;

            // EASYLOTTO  
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 1, 54321, 1, 1)
            ).to.not.be.reverted;
        });

        it("should handle edge values for rounds", async function () {
            // Minimum rounds
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1)
            ).to.not.be.reverted;

            // Maximum rounds (uint8 max)
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 255)
            ).to.not.be.reverted;
        });

        it("should handle maximum draw round values", async function () {
            const maxUint256 = ethers.constants.MaxUint256;
            
            await expect(
                ticketNFT.connect(minter).mint(user1.address, 0, 12345, maxUint256, 1)
            ).to.not.be.reverted;
        });

        it("should increment token IDs correctly", async function () {
            const tx1 = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            const receipt1 = await tx1.wait();
            const tokenId1 = receipt1.events[0].args.tokenId;

            const tx2 = await ticketNFT.connect(minter).mint(user1.address, 0, 54321, 1, 1);
            const receipt2 = await tx2.wait();
            const tokenId2 = receipt2.events[0].args.tokenId;

            expect(tokenId2).to.equal(tokenId1.add(1));
        });
    });

    describe("Token Information Retrieval", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 10, 5);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should return correct ticket information", async function () {
            const ticket = await ticketNFT.getTicket(tokenId);
            
            expect(ticket.player).to.equal(user1.address);
            expect(ticket.game).to.equal(0); // SUPERSEVEN
            expect(ticket.numbersPacked).to.equal(12345);
            expect(ticket.drawRound).to.equal(10);
            expect(ticket.roundsBought).to.equal(5);
            expect(ticket.roundsRemaining).to.equal(5);
            expect(ticket.status).to.equal(0); // ACTIVE
        });

        it("should revert for non-existent token", async function () {
            await expect(
                ticketNFT.getTicket(999999)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("Status Updates", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should update status correctly", async function () {
            await ticketNFT.connect(operator).updateStatus(tokenId, 1); // EXPIRED

            const ticket = await ticketNFT.getTicket(tokenId);
            expect(ticket.status).to.equal(1);
        });

        it("should emit event on status update", async function () {
            await expect(
                ticketNFT.connect(operator).updateStatus(tokenId, 2)
            ).to.emit(ticketNFT, "StatusUpdated")
              .withArgs(tokenId, 2);
        });

        it("should handle all status values", async function () {
            // ACTIVE = 0, EXPIRED = 1, REDEEMED = 2, BURNED = 3
            for (let status = 0; status <= 3; status++) {
                await expect(
                    ticketNFT.connect(operator).updateStatus(tokenId, status)
                ).to.not.be.reverted;

                const ticket = await ticketNFT.getTicket(tokenId);
                expect(ticket.status).to.equal(status);
            }
        });

        it("should revert for non-existent token", async function () {
            await expect(
                ticketNFT.connect(operator).updateStatus(999999, 1)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("Burning Functionality", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should burn token correctly", async function () {
            await ticketNFT.connect(operator).burn(tokenId);

            await expect(
                ticketNFT.ownerOf(tokenId)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("should emit burn event", async function () {
            await expect(
                ticketNFT.connect(operator).burn(tokenId)
            ).to.emit(ticketNFT, "Transfer")
              .withArgs(user1.address, ethers.constants.AddressZero, tokenId);
        });

        it("should revert when burning non-existent token", async function () {
            await expect(
                ticketNFT.connect(operator).burn(999999)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("should revert when burning already burned token", async function () {
            await ticketNFT.connect(operator).burn(tokenId);

            await expect(
                ticketNFT.connect(operator).burn(tokenId)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("Rounds Management", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 5);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should decrement rounds remaining", async function () {
            await ticketNFT.connect(operator).decrementRounds(tokenId);

            const ticket = await ticketNFT.getTicket(tokenId);
            expect(ticket.roundsRemaining).to.equal(4);
        });

        it("should emit event on rounds decrement", async function () {
            await expect(
                ticketNFT.connect(operator).decrementRounds(tokenId)
            ).to.emit(ticketNFT, "RoundsDecremented")
              .withArgs(tokenId, 4);
        });

        it("should revert when decrementing zero rounds", async function () {
            // Decrement to zero
            for (let i = 0; i < 5; i++) {
                await ticketNFT.connect(operator).decrementRounds(tokenId);
            }

            await expect(
                ticketNFT.connect(operator).decrementRounds(tokenId)
            ).to.be.revertedWith("No rounds remaining");
        });

        it("should revert for non-existent token", async function () {
            await expect(
                ticketNFT.connect(operator).decrementRounds(999999)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("User Ticket Queries", function () {
        beforeEach(async function () {
            // Mint multiple tickets for user1
            await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            await ticketNFT.connect(minter).mint(user1.address, 1, 54321, 2, 2);
            await ticketNFT.connect(minter).mint(user2.address, 0, 99999, 1, 1);
        });

        it("should return correct ticket count for user", async function () {
            expect(await ticketNFT.balanceOf(user1.address)).to.equal(2);
            expect(await ticketNFT.balanceOf(user2.address)).to.equal(1);
        });

        it("should return user tickets correctly", async function () {
            const user1Tickets = await ticketNFT.getUserTickets(user1.address);
            expect(user1Tickets.length).to.equal(2);

            const user2Tickets = await ticketNFT.getUserTickets(user2.address);
            expect(user2Tickets.length).to.equal(1);
        });

        it("should return empty array for user with no tickets", async function () {
            const [, , , noTicketsUser] = await ethers.getSigners();
            const tickets = await ticketNFT.getUserTickets(noTicketsUser.address);
            expect(tickets.length).to.equal(0);
        });
    });

    describe("Batch Operations", function () {
        it("should handle batch minting", async function () {
            const addresses = [user1.address, user1.address, user2.address];
            
            for (let i = 0; i < addresses.length; i++) {
                await expect(
                    ticketNFT.connect(minter).mint(addresses[i], i % 2, 12345 + i, 1, 1)
                ).to.not.be.reverted;
            }

            expect(await ticketNFT.balanceOf(user1.address)).to.equal(2);
            expect(await ticketNFT.balanceOf(user2.address)).to.equal(1);
        });

        it("should handle batch status updates", async function () {
            // Mint tokens
            await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            await ticketNFT.connect(minter).mint(user1.address, 0, 54321, 1, 1);

            // Update statuses
            await ticketNFT.connect(operator).updateStatus(1, 1);
            await ticketNFT.connect(operator).updateStatus(2, 2);

            const ticket1 = await ticketNFT.getTicket(1);
            const ticket2 = await ticketNFT.getTicket(2);

            expect(ticket1.status).to.equal(1);
            expect(ticket2.status).to.equal(2);
        });
    });

    describe("URI and Metadata", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should return correct token URI", async function () {
            const uri = await ticketNFT.tokenURI(tokenId);
            expect(uri).to.include(tokenId.toString());
        });

        it("should revert for non-existent token URI", async function () {
            await expect(
                ticketNFT.tokenURI(999999)
            ).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("Transfer Restrictions", function () {
        let tokenId;

        beforeEach(async function () {
            const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
            const receipt = await tx.wait();
            tokenId = receipt.events[0].args.tokenId;
        });

        it("should allow owner to transfer", async function () {
            await expect(
                ticketNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId)
            ).to.not.be.reverted;

            expect(await ticketNFT.ownerOf(tokenId)).to.equal(user2.address);
        });

        it("should revert when non-owner tries to transfer", async function () {
            await expect(
                ticketNFT.connect(user2).transferFrom(user1.address, user2.address, tokenId)
            ).to.be.revertedWith("ERC721: caller is not token owner or approved");
        });

        it("should work with approval", async function () {
            await ticketNFT.connect(user1).approve(user2.address, tokenId);
            
            await expect(
                ticketNFT.connect(user2).transferFrom(user1.address, user2.address, tokenId)
            ).to.not.be.reverted;
        });
    });

    describe("Supports Interface", function () {
        it("should support ERC721 interface", async function () {
            // ERC721 interface ID
            expect(await ticketNFT.supportsInterface("0x80ac58cd")).to.be.true;
        });

        it("should support AccessControl interface", async function () {
            // AccessControl interface ID
            expect(await ticketNFT.supportsInterface("0x7965db0b")).to.be.true;
        });
    });
});