// Unpause contract
// Run: npm run admin:unpause

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const network = hre.network.name;
    console.log(`▶️  Unpausing CryptoDraw contract on ${network}...`);

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

    // Check if already unpaused
    const isPaused = await cryptoDraw.paused();
    if (!isPaused) {
        console.log("⚠️  Contract is not paused!");
        return;
    }

    try {
        console.log("🔄 Unpausing contract...");
        const tx = await cryptoDraw.unpause();
        await tx.wait();
        
        console.log("✅ Contract unpaused successfully!");
        console.log("Transaction:", tx.hash);
        
    } catch (error) {
        console.error("❌ Failed to unpause contract:", error.message);
        
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