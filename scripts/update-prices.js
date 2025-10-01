// Update token prices in PriceOracle
// Run: npm run price:update

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const network = hre.network.name;
    console.log(`💰 Updating token prices on ${network}...`);

    // Load deployment info
    const deploymentFile = `./deployment-${network === 'harmony' ? 'harmony' : 'harmony'}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Please deploy contracts first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const priceOracle = await ethers.getContractAt("PriceOracle", deployment.contracts.priceOracle);

    // Current market prices (you can fetch from API in production)
    const prices = {
        // Native ONE
        [ethers.constants.AddressZero]: "15000000", // $0.015 (8 decimals)
        // wONE (same as native)
        [deployment.config.tokens.wONE]: "15000000", // $0.015
        // Example other tokens (update with real addresses and prices)
        // USDC: $1.00
        // USDT: $1.00  
        // ETH: $2500
        // BTC: $43000
    };

    console.log("📊 Updating prices:");

    for (const [token, price] of Object.entries(prices)) {
        try {
            console.log(`Updating ${token === ethers.constants.AddressZero ? 'Native ONE' : token}...`);
            
            const tx = await priceOracle.updatePrice(token, price);
            await tx.wait();
            
            const formattedPrice = ethers.utils.formatUnits(price, 8);
            console.log(`✅ ${token === ethers.constants.AddressZero ? 'Native ONE' : token}: $${formattedPrice}`);
            
        } catch (error) {
            console.log(`❌ Failed to update ${token}:`, error.message);
        }
    }

    console.log("\n🎉 Price update complete!");
    
    // Verify current prices
    console.log("\n📋 Current Prices:");
    try {
        for (const token of Object.keys(prices)) {
            const currentPrice = await priceOracle.getUSDPrice(token);
            const formattedPrice = ethers.utils.formatUnits(currentPrice, 8);
            console.log(`${token === ethers.constants.AddressZero ? 'Native ONE' : token}: $${formattedPrice}`);
        }
    } catch (error) {
        console.log("❌ Error reading prices:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });