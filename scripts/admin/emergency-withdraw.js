// Emergency withdrawal script
// Run: npm run admin:withdraw

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const network = hre.network.name;
    console.log(`🚨 Emergency withdrawal from CryptoDraw contract on ${network}...`);

    // Load deployment info
    const deploymentFile = `./deployment-${network === 'harmony' ? 'harmony' : 'harmony'}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Please deploy contracts first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const [admin] = await ethers.getSigners();

    console.log("Admin:", admin.address);
    console.log("🚨 WARNING: This is an emergency function!");
    
    const cryptoDraw = await ethers.getContractAt("CryptoDraw", deployment.contracts.cryptoDraw);

    try {
        // Check contract balance
        const contractBalance = await ethers.provider.getBalance(deployment.contracts.cryptoDraw);
        console.log("Contract Balance:", ethers.utils.formatEther(contractBalance), "ONE");
        
        if (contractBalance.eq(0)) {
            console.log("⚠️  Contract has no balance to withdraw");
            return;
        }

        // Get emergency wallet from environment or deployment config
        const emergencyWallet = process.env.EMERGENCY_WALLET || deployment.config.emergencyWallet;
        
        if (!emergencyWallet) {
            console.log("❌ Emergency wallet not configured!");
            return;
        }

        console.log("Emergency Wallet:", emergencyWallet);
        console.log(`🔄 Withdrawing ${ethers.utils.formatEther(contractBalance)} ONE...`);
        
        // Call emergency withdraw function (assuming it exists in the contract)
        const tx = await cryptoDraw.emergencyWithdraw(emergencyWallet);
        await tx.wait();
        
        console.log("✅ Emergency withdrawal successful!");
        console.log("Transaction:", tx.hash);
        
        // Verify withdrawal
        const newBalance = await ethers.provider.getBalance(deployment.contracts.cryptoDraw);
        console.log("New Contract Balance:", ethers.utils.formatEther(newBalance), "ONE");
        
    } catch (error) {
        console.error("❌ Emergency withdrawal failed:", error.message);
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 Make sure you're using the owner account");
        }
        
        if (error.message.includes("emergencyWithdraw")) {
            console.log("💡 Emergency withdrawal function may not be implemented in contract");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });