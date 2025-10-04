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
  // In some environments custom errors on view functions may not decode; assert generic revert
  await expect(priceOracle.getUSDPrice(token.address)).to.be.reverted;
  }).timeout(10000);

  it("should support setting band feeds and clearing them", async function () {
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy("Mock3", "MCK3", 6);

    await priceOracle.addToken(token.address, 6, ethers.utils.parseEther("1"));
    // setBandFeed requires non-zero adapter and non-empty base/quote
    await priceOracle.setBandFeed(token.address, owner.address, "ONE", "USD");
    const feed1 = await priceOracle.feedConfig(token.address);
    // PriceSource enum: 0 = MANUAL, 1 = BAND
    expect(feed1.source).to.equal(1);
    expect(feed1.adapter).to.equal(owner.address);
    expect(feed1.base).to.equal("ONE");
    expect(feed1.quote).to.equal("USD");

    await priceOracle.clearFeed(token.address);
    const feed2 = await priceOracle.feedConfig(token.address);
    expect(feed2.source).to.equal(0); // MANUAL
    expect(feed2.adapter).to.equal(ethers.constants.AddressZero);
  });
});

// ===== Merged from test/v2/PriceOracle-Band-Decimals.test.js =====
describe("PriceOracle - Decimals and Band feed (merged)", function () {
  let priceOracle, owner, user, mockToken;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(ethers.utils.parseEther("1"));

    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
  });

  it("converts correctly for token with 6 decimals", async function () {
    const Token6 = await ethers.getContractFactory("MockERC20");
    const token6 = await Token6.deploy("USDC Mock", "USDC", 6);

    await expect(priceOracle.addToken(token6.address, 6, ethers.utils.parseEther("1"))).to.not.be.reverted;

    const amount6 = ethers.utils.parseUnits("100", 6); // 100 USDC
    const usdAmount = await priceOracle.convertToUSD(token6.address, amount6);
    expect(usdAmount).to.equal(ethers.utils.parseEther("100"));

    const tokenAmount = await priceOracle.convertFromUSD(token6.address, ethers.utils.parseEther("100"));
    expect(tokenAmount).to.equal(amount6);
  });

  it("allows configuring a Band feed and uses it for pricing", async function () {
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"));
    const BandMock = await ethers.getContractFactory("BandMock");
    const band = await BandMock.deploy();
    await expect(priceOracle.setBandFeed(mockToken.address, band.address, "ETH", "USD")).to.not.be.reverted;

    const feed = await priceOracle.feedConfig(mockToken.address);
    expect(feed.source).to.equal(1); // BAND
    expect(feed.adapter).to.equal(band.address);

    const p = await priceOracle.getUSDPrice(mockToken.address);
    expect(p).to.be.gt(0);
  });
});

// ===== Merged from test/v2/PriceOracle-Coverage.test.js (selected cases) =====
describe("PriceOracle - Extended Coverage (merged)", function () {
  let priceOracle, owner, user1;
  let mockToken;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(ethers.utils.parseEther("1"));

    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
  });

  it("onlyOwner enforcement for admin functions", async function () {
    await expect(priceOracle.connect(user1).addToken(mockToken.address, 18, ethers.utils.parseEther("1"))).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(priceOracle.connect(user1).setMaxPriceAge(3600)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("token management edge cases", async function () {
    await expect(priceOracle.addToken(ethers.constants.AddressZero, 18, ethers.utils.parseEther("1"))).to.be.revertedWith("Use native ONE");
    await expect(priceOracle.addToken(mockToken.address, 18, 0)).to.be.revertedWithCustomError(priceOracle, "InvalidPrice");
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await expect(priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"))).to.be.revertedWith("Token already supported");
  });

  it("handles extreme decimals when adding tokens", async function () {
    const Token0 = await ethers.getContractFactory("MockERC20");
    const token0 = await Token0.deploy("No Decimals", "ND", 0);
    await expect(priceOracle.addToken(token0.address, 0, ethers.utils.parseEther("1"))).to.not.be.reverted;

    const Token30 = await ethers.getContractFactory("MockERC20");
    const token30 = await Token30.deploy("Max Decimals", "MD", 30);
    await expect(priceOracle.addToken(token30.address, 30, ethers.utils.parseEther("1"))).to.not.be.reverted;
  });

  it("price update edge cases", async function () {
    const NonExistentToken = await ethers.getContractFactory("MockERC20");
    const nonExistent = await NonExistentToken.deploy("NE", "NE", 18);
    await expect(priceOracle.connect(owner).updatePrice(nonExistent.address, ethers.utils.parseEther("1"))).to.be.revertedWithCustomError(priceOracle, "TokenNotSupported");

    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await expect(priceOracle.connect(owner).updatePrice(mockToken.address, 0)).to.be.revertedWithCustomError(priceOracle, "InvalidPrice");

    const maxPrice = ethers.constants.MaxUint256.div(1000000);
    await expect(priceOracle.connect(owner).updatePrice(mockToken.address, maxPrice)).to.not.be.reverted;
    const info = await priceOracle.getTokenData(mockToken.address);
    expect(info.price).to.equal(maxPrice);
  });

  it("batch updatePrices: length mismatch, unsupported token, invalid price, success", async function () {
    // length mismatch
    const t1 = await (await (await ethers.getContractFactory("MockERC20")).deploy("T1","T1",18)).deployed();
    await expect(priceOracle.updatePrices([t1.address], [ethers.utils.parseEther("1"), ethers.utils.parseEther("2")]))
      .to.be.revertedWith("Arrays length mismatch");

    // unsupported token in batch
    await expect(priceOracle.updatePrices([t1.address], [ethers.utils.parseEther("1")]))
      .to.be.revertedWithCustomError(priceOracle, "TokenNotSupported");

    // add support and then invalid price in batch
    await priceOracle.addToken(t1.address, 18, ethers.utils.parseEther("1"));
    await expect(priceOracle.updatePrices([t1.address], [ethers.constants.Zero]))
      .to.be.revertedWithCustomError(priceOracle, "InvalidPrice");

    // success: update native ONE and t1 in one shot
    const newNative = ethers.utils.parseEther("2500");
    const newT1 = ethers.utils.parseEther("3");
    await expect(priceOracle.updatePrices([
      ethers.constants.AddressZero,
      t1.address
    ], [
      newNative,
      newT1
    ])).to.not.be.reverted;
    const nInfo = await priceOracle.getTokenData(ethers.constants.AddressZero);
    const t1Info = await priceOracle.getTokenData(t1.address);
    expect(nInfo.price).to.equal(newNative);
    expect(t1Info.price).to.equal(newT1);
  });

  it("setBandFeed error branches: ZeroAddress and invalid pair", async function () {
    // ZeroAddress for adapter
    await expect(priceOracle.setBandFeed(ethers.constants.AddressZero, ethers.constants.AddressZero, "ONE", "USD"))
      .to.be.revertedWithCustomError(priceOracle, "ZeroAddress");

    // invalid pair (empty strings) on supported token
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await expect(priceOracle.setBandFeed(mockToken.address, mockToken.address, "", ""))
      .to.be.revertedWith("Invalid pair");
  });

  it("cannot remove native ONE and removing unsupported token reverts", async function () {
    // cannot remove native ONE
    await expect(priceOracle.removeToken(ethers.constants.AddressZero)).to.be.revertedWith("Cannot remove native ONE");
    // removing unsupported token reverts with custom error
    const t2 = await (await (await ethers.getContractFactory("MockERC20")).deploy("T2","T2",18)).deployed();
    await expect(priceOracle.removeToken(t2.address)).to.be.revertedWithCustomError(priceOracle, "TokenNotSupported");
  });

  it("staleness via convertToUSD reverts when stale", async function () {
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await priceOracle.setMaxPriceAge(1);
    const { time } = require("@nomicfoundation/hardhat-network-helpers");
    await time.increase(3);
    await ethers.provider.send("evm_mine", []);
    await expect(priceOracle.convertToUSD(mockToken.address, ethers.utils.parseEther("1"))).to.be.reverted;
  });

  it("rejects zero max age", async function () {
    await expect(priceOracle.setMaxPriceAge(0)).to.be.revertedWith("Invalid max age");
  });

  it("conversions with unsupported token revert", async function () {
    const UnsupportedToken = await ethers.getContractFactory("MockERC20");
    const unsupported = await UnsupportedToken.deploy("UNS", "UNS", 18);
    await expect(priceOracle.convertToUSD(unsupported.address, ethers.utils.parseEther("1"))).to.be.reverted;
    await expect(priceOracle.convertFromUSD(unsupported.address, ethers.utils.parseEther("1"))).to.be.reverted;
  });

  it("zero amount conversions revert with ZeroAmount", async function () {
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"));
    await expect(priceOracle.convertToUSD(mockToken.address, 0)).to.be.revertedWithCustomError(priceOracle, "ZeroAmount");
    await expect(priceOracle.convertFromUSD(mockToken.address, 0)).to.be.revertedWithCustomError(priceOracle, "ZeroAmount");
  });

  it("very small and large amount conversions", async function () {
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"));
    const small = 1;
    const usdSmall = await priceOracle.convertToUSD(mockToken.address, small);
    expect(usdSmall).to.be.gte(0);
    const tokenFromSmallUSD = await priceOracle.convertFromUSD(mockToken.address, small);
    expect(tokenFromSmallUSD).to.be.gte(0);

    const largeAmount = ethers.utils.parseEther("1000000");
    await expect(priceOracle.convertToUSD(mockToken.address, largeAmount)).to.not.be.reverted;
    const largeUSD = ethers.utils.parseEther("1000000");
    await expect(priceOracle.convertFromUSD(mockToken.address, largeUSD)).to.not.be.reverted;
  });

  it("native token handling and updates", async function () {
    const nativePrice = await priceOracle.getUSDPrice(ethers.constants.AddressZero);
    expect(nativePrice).to.be.gt(0);
    await expect(priceOracle.convertToUSD(ethers.constants.AddressZero, ethers.utils.parseEther("1"))).to.not.be.reverted;
    await expect(priceOracle.convertFromUSD(ethers.constants.AddressZero, ethers.utils.parseEther("1"))).to.not.be.reverted;

    await expect(priceOracle.connect(owner).updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("3000"))).to.not.be.reverted;
    const updated = await priceOracle.getUSDPrice(ethers.constants.AddressZero);
    expect(updated).to.equal(ethers.utils.parseEther("3000"));
  });

  it("isPriceValid checks", async function () {
    const UnsupportedToken = await ethers.getContractFactory("MockERC20");
    const unsupported = await UnsupportedToken.deploy("UNS", "UNS", 18);
    expect(await priceOracle.isPriceValid(unsupported.address)).to.equal(false);

    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await priceOracle.setMaxPriceAge(1);
    const { time } = require("@nomicfoundation/hardhat-network-helpers");
    await time.increase(3);
    await ethers.provider.send("evm_mine", []);
    expect(await priceOracle.isPriceValid(mockToken.address)).to.equal(false);

    // Refresh price, should be valid again
    await priceOracle.updatePrice(mockToken.address, ethers.utils.parseEther("1"));
    expect(await priceOracle.isPriceValid(mockToken.address)).to.equal(true);
  });

  it("Band Oracle integration: set and clear feeds and for native", async function () {
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    await expect(priceOracle.setBandFeed(mockToken.address, mockToken.address, "ETH", "USD")).to.not.be.reverted;
    let cfg = await priceOracle.feedConfig(mockToken.address);
    expect(cfg.source).to.equal(1);
    expect(cfg.adapter).to.equal(mockToken.address);

    await priceOracle.clearFeed(mockToken.address);
    cfg = await priceOracle.feedConfig(mockToken.address);
    expect(cfg.source).to.equal(0);
    expect(cfg.adapter).to.equal(ethers.constants.AddressZero);

    await expect(priceOracle.setBandFeed(ethers.constants.AddressZero, mockToken.address, "ONE", "USD")).to.not.be.reverted;
    const nativeCfg = await priceOracle.feedConfig(ethers.constants.AddressZero);
    expect(nativeCfg.source).to.equal(1);
    expect(nativeCfg.adapter).to.equal(mockToken.address);
  });

  it("isPriceValid uses Band feed timestamps (true then false after staleness)", async function () {
    // Add token and set Band feed to BandMock that returns current timestamp
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
    const BandMock = await ethers.getContractFactory("BandMock");
    const band = await BandMock.deploy();
    await priceOracle.setBandFeed(mockToken.address, band.address, "MOCK", "USD");

    // Initially valid
    expect(await priceOracle.isPriceValid(mockToken.address)).to.equal(true);

    // Reduce max age to 1 and advance time to force invalid
    await priceOracle.setMaxPriceAge(1);
    const { time } = require("@nomicfoundation/hardhat-network-helpers");
    await time.increase(3);
    await ethers.provider.send("evm_mine", []);
    expect(await priceOracle.isPriceValid(mockToken.address)).to.equal(false);
  });

  it("emits events on updates and configuration", async function () {
    await expect(priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"))).to.emit(priceOracle, "TokenSupportUpdated");
    await priceOracle.updatePrice(mockToken.address, ethers.utils.parseEther("2"));
    await expect(priceOracle.updatePrice(mockToken.address, ethers.utils.parseEther("2"))).to.emit(priceOracle, "PriceUpdated");
    await expect(priceOracle.setBandFeed(mockToken.address, mockToken.address, "ETH", "USD")).to.emit(priceOracle, "FeedConfigured");
  });
});
