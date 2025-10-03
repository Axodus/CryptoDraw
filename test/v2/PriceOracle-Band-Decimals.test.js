const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle - Band feed and decimals coverage", function () {
    let priceOracle, owner, user, mockToken;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy(ethers.utils.parseEther("1"));

        const MockToken = await ethers.getContractFactory("MockToken");
        mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
    });

    it("should convert correctly for token with 6 decimals", async function () {
        const Token6 = await ethers.getContractFactory("MockERC20");
        const token6 = await Token6.deploy("USDC Mock", "USDC", 6);

        // Price = 1 USD (18 decimals)
        await expect(
            priceOracle.addToken(token6.address, 6, ethers.utils.parseEther("1"))
        ).to.not.be.reverted;

        const amount6 = ethers.utils.parseUnits("100", 6); // 100 USDC
        const usdAmount = await priceOracle.convertToUSD(token6.address, amount6);
        expect(usdAmount).to.equal(ethers.utils.parseEther("100"));

        const tokenAmount = await priceOracle.convertFromUSD(token6.address, ethers.utils.parseEther("100"));
        expect(tokenAmount).to.equal(amount6);
    });

    it("should allow configuring a Band feed and use it for pricing", async function () {
        // Ensure token is added
        await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"));

        // Deploy a Band-like mock adapter
        const BandMock = await ethers.getContractFactory("BandMock");
        const band = await BandMock.deploy();

        // Use the band mock as adapter
        await expect(
            priceOracle.setBandFeed(mockToken.address, band.address, "ETH", "USD")
        ).to.not.be.reverted;

        const feed = await priceOracle.feedConfig(mockToken.address);
        expect(feed.source).to.equal(1); // BAND
        expect(feed.adapter).to.equal(band.address);

        // getUSDPrice should read the feed (mock returns a non-zero rate)
        const p = await priceOracle.getUSDPrice(mockToken.address);
        expect(p).to.be.gt(0);
    });
});
