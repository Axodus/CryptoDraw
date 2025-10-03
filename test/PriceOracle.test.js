const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle - Coverage", function () {
  let priceOracle, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy();
    await priceOracle.deployed();
  });

  it("should add and remove tokens and convert prices", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock", "MCK", 18);

    await priceOracle.addToken(token.address, 18, ethers.constants.AddressZero);
    await priceOracle.updatePrice(token.address, 2000); // 2000 USD with implied decimals

    const cents = await priceOracle.convertToUSD(token.address, ethers.utils.parseUnits("1", 18));
    expect(cents).to.be.gt(0);

    const tokens = await priceOracle.convertFromUSD(token.address, 100); // 100 USD
    expect(tokens).to.be.gt(0);

    await priceOracle.removeToken(token.address);
    await expect(priceOracle.convertToUSD(token.address, 1)).to.be.reverted;
  });

  it("should handle price staleness and max age", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock2", "MCK2", 8);

    await priceOracle.addToken(token.address, 8, ethers.constants.AddressZero);
    await priceOracle.updatePrice(token.address, 1000);
    await priceOracle.setMaxPriceAge(1); // 1 second to force staleness quickly

    // wait 2 seconds
    await new Promise((res) => setTimeout(res, 2000));

    await expect(priceOracle.getUSDPrice(token.address)).to.be.reverted;
  }).timeout(10000);

  it("should support setting band feeds and clearing them", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock3", "MCK3", 6);

    await priceOracle.addToken(token.address, 6, ethers.constants.AddressZero);
    await priceOracle.setBandFeed(token.address, ethers.constants.AddressZero);
    expect(await priceOracle.hasBandFeed(token.address)).to.be.true;
    await priceOracle.clearBandFeed(token.address);
    expect(await priceOracle.hasBandFeed(token.address)).to.be.false;
  });
});
