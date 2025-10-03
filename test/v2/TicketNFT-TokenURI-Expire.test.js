const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketNFT - tokenURI and expire behavior", function () {
    let ticketNFT, owner, user1, minter;

    beforeEach(async function () {
        [owner, user1, minter] = await ethers.getSigners();

        const TicketNFT = await ethers.getContractFactory("TicketNFT");
        ticketNFT = await TicketNFT.deploy();

        // set minter as CryptoDraw
        await ticketNFT.setCryptoDrawAddress(minter.address);
    });

    it("should produce tokenURI containing expected fields for each status", async function () {
        const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
        const receipt = await tx.wait();
        const tokenId = receipt.events.find(e => e.event === 'TicketMinted').args.tokenId;

        // Active
    const uriActive = await ticketNFT.tokenURI(tokenId);
    expect(uriActive).to.be.a('string');
    // tokenURI is data:application/json;base64,<payload>
    const base64 = uriActive.split(',')[1];
    const buff = Buffer.from(base64, 'base64');
    const json = buff.toString('utf8');
    expect(json).to.include('#');

        // Expire
        await ticketNFT.connect(minter).updateStatus(tokenId, 1);
        const uriExpired = await ticketNFT.tokenURI(tokenId);
        expect(uriExpired).to.include('Expired');

        // Redeem
        await ticketNFT.connect(minter).updateStatus(tokenId, 2);
        const uriRedeemed = await ticketNFT.tokenURI(tokenId);
        expect(uriRedeemed).to.include('Redeemed');

        // Burn (mint a new token to test burned state via burn)
        const tx2 = await ticketNFT.connect(minter).mint(user1.address, 0, 54321, 1, 1);
        const r2 = await tx2.wait();
        const id2 = r2.events.find(e => e.event === 'TicketMinted').args.tokenId;
        await ticketNFT.connect(minter).burn(id2);
        await expect(ticketNFT.tokenURI(id2)).to.be.reverted;
    });

    it("should auto-expire when rounds reach zero via decrementRounds", async function () {
        const tx = await ticketNFT.connect(minter).mint(user1.address, 0, 12345, 1, 1);
        const receipt = await tx.wait();
        const tokenId = receipt.events.find(e => e.event === 'TicketMinted').args.tokenId;

        await ticketNFT.connect(minter).decrementRounds(tokenId);

        const ticket = await ticketNFT.getTicket(tokenId);
        expect(ticket.roundsRemaining).to.equal(0);
        expect(ticket.status).to.equal(1); // EXPIRED
    });
});
