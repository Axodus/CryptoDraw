// Emergency pause contract
// Run: npm run admin:pause

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const network = hre.network.name;
    console.log(`⏸️  Pausing CryptoDraw contract on ${network}...`);

    // Load deployment info
    const deploymentFile = `./deployment-${network === 'harmony' ? 'harmony' : 'harmony'}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Please deploy contracts first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const [admin] = await ethers.getSigners();

    console.log("Admin:", admin.address);
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", deployment.contracts.cryptoDraw);

    // Check if already paused
    const isPaused = await cryptoDraw.paused();
    if (isPaused) {
        console.log("⚠️  Contract is already paused!");
        return;
    }

    try {
        console.log("🔄 Pausing contract...");
        const tx = await cryptoDraw.pause();
        await tx.wait();
        
        console.log("✅ Contract paused successfully!");
        console.log("Transaction:", tx.hash);
        
    } catch (error) {
        console.error("❌ Failed to pause contract:", error.message);
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 Make sure you're using the owner account");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });