// Fund test accounts with ONE tokens
// Run: npm run fund:testnet

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    const network = hre.network.name;
    console.log(`💰 Funding accounts on ${network}...`);

    const [deployer] = await ethers.getSigners();
    console.log("Funding from:", deployer.address);
    console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ONE");

    // Test accounts to fund
    const testAccounts = [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
    ];

    const fundAmount = ethers.utils.parseEther("10.0"); // 10 ONE each

    for (const account of testAccounts) {
        try {
            const tx = await deployer.sendTransaction({
                to: account,
                value: fundAmount,
                gasLimit: 21000
            });
            
            await tx.wait();
            console.log(`✅ Funded ${account} with ${ethers.utils.formatEther(fundAmount)} ONE`);
        } catch (error) {
            console.log(`❌ Failed to fund ${account}:`, error.message);
        }
    }

    console.log("🎉 Funding complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });