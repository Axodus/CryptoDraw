const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle - Coverage", function () {
  let priceOracle, owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const initialOnePrice = ethers.utils.parseEther("2000"); // ONE = $2000
    priceOracle = await PriceOracle.deploy(initialOnePrice);
    await priceOracle.deployed();
  });

  it("should add and remove tokens and convert prices", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock", "MCK", 18);

  await priceOracle.addToken(token.address, 18, ethers.utils.parseEther("1")); // $1
  await priceOracle.updatePrice(token.address, ethers.utils.parseEther("2")); // $2

  const usd = await priceOracle.convertToUSD(token.address, ethers.utils.parseUnits("1", 18));
  expect(usd).to.equal(ethers.utils.parseEther("2")); // 1 token * $2

  const tokens = await priceOracle.convertFromUSD(token.address, ethers.utils.parseEther("1")); // $1
  expect(tokens).to.equal(ethers.utils.parseUnits("0.5", 18)); // $1 / $2 = 0.5

  await priceOracle.removeToken(token.address);
  await expect(priceOracle.convertToUSD(token.address, 1)).to.be.reverted;
  });

  it("should handle price staleness and max age", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock2", "MCK2", 8);

  await priceOracle.addToken(token.address, 8, ethers.utils.parseEther("1"));
  await priceOracle.updatePrice(token.address, ethers.utils.parseEther("1"));
    await priceOracle.setMaxPriceAge(1); // 1 second to force staleness quickly

    // increase time in EVM
  const { time } = require("@nomicfoundation/hardhat-network-helpers");
  await time.increase(120);
  // força mineração de um novo bloco
  await ethers.provider.send("evm_mine", []);
  await expect(priceOracle.getUSDPrice(token.address)).to.be.revertedWithCustomError(priceOracle, "StalePrice");
  }).timeout(10000);

  it("should support setting band feeds and clearing them", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock3", "MCK3", 6);

    await priceOracle.addToken(token.address, 6, ethers.utils.parseEther("1"));
    // setBandFeed requires non-zero adapter and non-empty base/quote
    await priceOracle.setBandFeed(token.address, owner.address, "ONE", "USD");
    const feed1 = await priceOracle.feedConfig(token.address);
    // PriceSource enum: 0 = MANUAL, 1 = BAND
    expect(feed1.source.toNumber()).to.equal(1);
    expect(feed1.adapter).to.equal(owner.address);
    expect(feed1.base).to.equal("ONE");
    expect(feed1.quote).to.equal("USD");

    await priceOracle.clearFeed(token.address);
    const feed2 = await priceOracle.feedConfig(token.address);
    expect(feed2.source.toNumber()).to.equal(0); // MANUAL
    expect(feed2.adapter).to.equal(ethers.constants.AddressZero);
  });
});
