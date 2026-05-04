// Contract verification script
// Run: npm run verify:testnet

const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const network = hre.network.name;
    console.log(`🔍 Verifying contracts on ${network}...`);

    // Load deployment info
    const deploymentFile = `./deployment-${network === 'harmony' ? 'harmony' : 'harmony'}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Please deploy contracts first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const contracts = deployment.contracts;
    const config = deployment.config;

    try {
        // Verify PriceOracle
        console.log("🔍 Verifying PriceOracle...");
        await hre.run("verify:verify", {
            address: contracts.priceOracle,
            constructorArguments: [config.initialONEPriceUSD]
        });
        console.log("✅ PriceOracle verified");

        // Verify TicketNFT  
        console.log("🔍 Verifying TicketNFT...");
        await hre.run("verify:verify", {
            address: contracts.ticketNFT,
            constructorArguments: []
        });
        console.log("✅ TicketNFT verified");

        // Verify GameLibrary
        console.log("🔍 Verifying GameLibrary...");
        await hre.run("verify:verify", {
            address: contracts.gameLibrary,
            constructorArguments: []
        });
        console.log("✅ GameLibrary verified");

        // Verify CryptoDraw (complex due to libraries)
        console.log("🔍 Verifying CryptoDraw...");
        await hre.run("verify:verify", {
            address: contracts.cryptoDraw,
            constructorArguments: [
                contracts.ticketNFT,
                contracts.priceOracle,
                config.treasuryWallet,
                config.prizeWallet,
                config.projectFund,
                config.grantFund,
                config.operationFund
            ]
        });
        console.log("✅ CryptoDraw verified");

        console.log("\n🎉 All contracts verified successfully!");

    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        
        // Common troubleshooting tips
        console.log("\n💡 Troubleshooting tips:");
        console.log("- Make sure contracts are deployed and confirmed");
        console.log("- Check if constructor arguments match exactly");
        console.log("- Verify you have the correct API key in hardhat.config.js");
        console.log("- Some contracts may already be verified");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });