/**
 * @title Edge Cases and Error Handling Tests for PriceOracle
 * @dev Tests for require/revert statements, modifiers, and boundary conditions
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle - Coverage Tests", function () {
    let priceOracle;
    let owner, user1, operator;
    let mockToken;

    beforeEach(async function () {
        [owner, user1, operator] = await ethers.getSigners();

        // Deploy PriceOracle
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy(owner.address);

        // Deploy mock token
        const MockToken = await ethers.getContractFactory("MockToken");
        mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);

        // PriceOracle uses Ownable, no operator role needed for basic setup
    });

    describe("Access Control - onlyOwner modifier", function () {
        it("should revert when non-owner calls owner-only functions", async function () {
            await expect(
                priceOracle.connect(user1).addToken(mockToken.address, 18, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                priceOracle.connect(user1).setMaxPriceAge(3600)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Access Control - onlyOwner for operator functions", function () {
        it("should revert when non-owner calls updatePrice", async function () {
            await expect(
                priceOracle.connect(user1).updatePrice(mockToken.address, ethers.utils.parseEther("2"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should allow owner to call owner functions", async function () {
            // First add the token
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
            
            await expect(
                priceOracle.connect(owner).updatePrice(mockToken.address, ethers.utils.parseEther("2"))
            ).to.not.be.reverted;
        });
    });

    describe("Token Management Edge Cases", function () {
        it("should revert when adding zero address token", async function () {
            await expect(
                priceOracle.addToken(ethers.constants.AddressZero, 18, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Cannot add native token using addToken");
        });

        it("should revert when adding token with zero price", async function () {
            await expect(
                priceOracle.addToken(mockToken.address, 18, 0)
            ).to.be.revertedWith("Price must be greater than 0");
        });

        it("should revert when adding duplicate token", async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
            
            await expect(
                priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2"))
            ).to.be.revertedWith("Token already exists");
        });

        it("should handle token with different decimals", async function () {
            // Test with 6 decimals (like USDC)
            const Token6 = await ethers.getContractFactory("MockERC20");
            const token6 = await Token6.deploy("USDC Mock", "USDC", 6);

            await expect(
                priceOracle.addToken(token6.address, 6, ethers.utils.parseUnits("1", 18)) // Price in 18 decimals
            ).to.not.be.reverted;

            // Test conversion
            const amount6 = ethers.utils.parseUnits("100", 6); // 100 USDC
            const usdAmount = await priceOracle.convertToUSD(token6.address, amount6);
            expect(usdAmount).to.equal(ethers.utils.parseEther("100")); // Should be 100 USD
        });

        it("should handle extreme decimal cases", async function () {
            // Test with 0 decimals
            const Token0 = await ethers.getContractFactory("MockERC20");
            const token0 = await Token0.deploy("No Decimals", "ND", 0);

            await expect(
                priceOracle.addToken(token0.address, 0, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;

            // Test with maximum decimals (shouldn't overflow)
            const Token30 = await ethers.getContractFactory("MockERC20");
            const token30 = await Token30.deploy("Max Decimals", "MD", 30);

            await expect(
                priceOracle.addToken(token30.address, 30, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;
        });
    });

    describe("Price Update Edge Cases", function () {
        beforeEach(async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
        });

        it("should revert when updating non-existent token", async function () {
            const NonExistentToken = await ethers.getContractFactory("MockERC20");
            const nonExistentToken = await NonExistentToken.deploy("Non Existent", "NE", 18);

            await expect(
                priceOracle.connect(operator).updatePrice(nonExistentToken.address, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Token not supported");
        });

        it("should revert when updating with zero price", async function () {
            await expect(
                priceOracle.connect(operator).updatePrice(mockToken.address, 0)
            ).to.be.revertedWith("Price must be greater than 0");
        });

        it("should handle maximum price values", async function () {
            const maxPrice = ethers.constants.MaxUint256.div(1000000); // Avoid overflow in calculations
            
            await expect(
                priceOracle.connect(operator).updatePrice(mockToken.address, maxPrice)
            ).to.not.be.reverted;

            const tokenInfo = await priceOracle.tokens(mockToken.address);
            expect(tokenInfo.priceUSD).to.equal(maxPrice);
        });
    });

    describe("Price Staleness Validation", function () {
        beforeEach(async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
        });

        it("should revert when price is stale", async function () {
            // Set max age to 1 hour
            await priceOracle.setMaxPriceAge(3600);

            // Fast forward time to make price stale
            await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
            await ethers.provider.send("evm_mine");

            await expect(
                priceOracle.convertToUSD(mockToken.address, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Price is stale");
        });

        it("should work when price is fresh", async function () {
            // Set max age to 1 hour
            await priceOracle.setMaxPriceAge(3600);

            // Update price to reset timestamp
            await priceOracle.connect(operator).updatePrice(mockToken.address, ethers.utils.parseEther("1"));

            await expect(
                priceOracle.convertToUSD(mockToken.address, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;
        });

        it("should handle zero max age (no staleness check)", async function () {
            await priceOracle.setMaxPriceAge(0);

            // Fast forward a lot
            await ethers.provider.send("evm_increaseTime", [86400 * 365]); // 1 year
            await ethers.provider.send("evm_mine");

            // Should still work with zero max age
            await expect(
                priceOracle.convertToUSD(mockToken.address, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;
        });
    });

    describe("Price Conversion Edge Cases", function () {
        beforeEach(async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("2")); // $2 per token
        });

        it("should revert when converting unsupported token", async function () {
            const UnsupportedToken = await ethers.getContractFactory("MockERC20");
            const unsupportedToken = await UnsupportedToken.deploy("Unsupported", "UNS", 18);

            await expect(
                priceOracle.convertToUSD(unsupportedToken.address, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Token not supported");

            await expect(
                priceOracle.convertFromUSD(unsupportedToken.address, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Token not supported");
        });

        it("should handle zero amount conversions", async function () {
            const usdAmount = await priceOracle.convertToUSD(mockToken.address, 0);
            expect(usdAmount).to.equal(0);

            const tokenAmount = await priceOracle.convertFromUSD(mockToken.address, 0);
            expect(tokenAmount).to.equal(0);
        });

        it("should handle very small amounts", async function () {
            const smallAmount = 1; // 1 wei
            
            const usdAmount = await priceOracle.convertToUSD(mockToken.address, smallAmount);
            expect(usdAmount).to.be.gt(0);

            const tokenAmount = await priceOracle.convertFromUSD(mockToken.address, smallAmount);
            expect(tokenAmount).to.be.gte(0); // Could round to 0
        });

        it("should handle large amounts without overflow", async function () {
            const largeAmount = ethers.utils.parseEther("1000000"); // 1M tokens
            
            await expect(
                priceOracle.convertToUSD(mockToken.address, largeAmount)
            ).to.not.be.reverted;

            const largeUSD = ethers.utils.parseEther("1000000"); // 1M USD
            await expect(
                priceOracle.convertFromUSD(mockToken.address, largeUSD)
            ).to.not.be.reverted;
        });
    });

    describe("Native Token Handling", function () {
        it("should handle native token operations", async function () {
            // Native token should be pre-configured
            const nativeInfo = await priceOracle.tokens(ethers.constants.AddressZero);
            expect(nativeInfo.decimals).to.equal(18);
            expect(nativeInfo.priceUSD).to.be.gt(0);

            // Test conversions
            await expect(
                priceOracle.convertToUSD(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;

            await expect(
                priceOracle.convertFromUSD(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
            ).to.not.be.reverted;
        });

        it("should allow updating native token price", async function () {
            await expect(
                priceOracle.connect(operator).updatePrice(ethers.constants.AddressZero, ethers.utils.parseEther("3000"))
            ).to.not.be.reverted;

            const nativeInfo = await priceOracle.tokens(ethers.constants.AddressZero);
            expect(nativeInfo.priceUSD).to.equal(ethers.utils.parseEther("3000"));
        });
    });

    describe("Price Validation Function", function () {
        beforeEach(async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));
        });

        it("should return false for unsupported token", async function () {
            const UnsupportedToken = await ethers.getContractFactory("MockERC20");
            const unsupportedToken = await UnsupportedToken.deploy("Unsupported", "UNS", 18);

            const isValid = await priceOracle.isPriceValid(unsupportedToken.address);
            expect(isValid).to.be.false;
        });

        it("should return false for stale price", async function () {
            await priceOracle.setMaxPriceAge(3600);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");

            const isValid = await priceOracle.isPriceValid(mockToken.address);
            expect(isValid).to.be.false;
        });

        it("should return true for valid price", async function () {
            const isValid = await priceOracle.isPriceValid(mockToken.address);
            expect(isValid).to.be.true;
        });
    });

    describe("Band Oracle Integration", function () {
        it("should set Band feed configuration", async function () {
            // Mock Band oracle address
            const mockBandOracle = mockToken.address; // Reuse for simplicity

            await expect(
                priceOracle.setBandFeed(mockToken.address, mockBandOracle, "ETH", "USD")
            ).to.not.be.reverted;

            const feedConfig = await priceOracle.feedConfig(mockToken.address);
            expect(feedConfig.source).to.equal(1); // BAND
            expect(feedConfig.adapter).to.equal(mockBandOracle);
        });

        it("should clear Band feed configuration", async function () {
            const mockBandOracle = mockToken.address;
            
            // Set first
            await priceOracle.setBandFeed(mockToken.address, mockBandOracle, "ETH", "USD");
            
            // Then clear
            await priceOracle.clearFeed(mockToken.address);

            const feedConfig = await priceOracle.feedConfig(mockToken.address);
            expect(feedConfig.source).to.equal(0); // MANUAL
            expect(feedConfig.adapter).to.equal(ethers.constants.AddressZero);
        });

        it("should prevent setting Band feed for native token", async function () {
            await expect(
                priceOracle.setBandFeed(ethers.constants.AddressZero, mockToken.address, "ONE", "USD")
            ).to.be.revertedWith("Use native config for native token");
        });
    });

    describe("Event Emission", function () {
        it("should emit events on price updates", async function () {
            await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"));

            await expect(
                priceOracle.connect(operator).updatePrice(mockToken.address, ethers.utils.parseEther("2"))
            ).to.emit(priceOracle, "PriceUpdated")
              .withArgs(mockToken.address, ethers.utils.parseEther("2"));
        });

        it("should emit events on token addition", async function () {
            await expect(
                priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther("1"))
            ).to.emit(priceOracle, "TokenAdded")
              .withArgs(mockToken.address, 18, ethers.utils.parseEther("1"));
        });

        it("should emit events on Band feed configuration", async function () {
            await expect(
                priceOracle.setBandFeed(mockToken.address, mockToken.address, "ETH", "USD")
            ).to.emit(priceOracle, "FeedConfigured")
              .withArgs(mockToken.address, 1, mockToken.address);
        });
    });
});