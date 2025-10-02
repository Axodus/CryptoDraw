const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic Test", function () {
  it("Should verify that testing environment is working", async function () {
    const [owner] = await ethers.getSigners();
    expect(owner.address).to.be.properAddress;
  });

  it("Should be able to deploy a simple contract", async function () {
    // Deploy TicketNFT contract
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticketNFT = await TicketNFT.deploy();
    await ticketNFT.deployed();
    
    expect(ticketNFT.address).to.be.properAddress;
    expect(await ticketNFT.name()).to.equal("CryptoDraw Ticket NFT");
    expect(await ticketNFT.symbol()).to.equal("CDRAW");
  });
});