// Interactive script for contract operations
// Run: npm run interact:testnet

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    const network = hre.network.name;
    console.log(`🎮 CryptoDraw Interactive Console - ${network}`);
    console.log("=" .repeat(50));

    // Load deployment info
    const deploymentFile = `./deployment-${network === 'harmony' ? 'harmony' : 'harmony'}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Please deploy contracts first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const [signer] = await ethers.getSigners();
    
    console.log("📋 Contract Addresses:");
    console.log("CryptoDraw:", deployment.contracts.cryptoDraw);
    console.log("TicketNFT:", deployment.contracts.ticketNFT);
    console.log("PriceOracle:", deployment.contracts.priceOracle);
    console.log("");

    // Get contract instances
    const CryptoDraw = await ethers.getContractAt("CryptoDraw", deployment.contracts.cryptoDraw);
    const TicketNFT = await ethers.getContractAt("TicketNFT", deployment.contracts.ticketNFT);
    const PriceOracle = await ethers.getContractAt("PriceOracle", deployment.contracts.priceOracle);

    while (true) {
        console.log("\n🎯 Available Operations:");
        console.log("1. Check contract status");
        console.log("2. Buy EasyLotto ticket");
        console.log("3. Buy SuperSete ticket");  
        console.log("4. Check ticket info");
        console.log("5. Update token price");
        console.log("6. Create new draw");
        console.log("7. Check draw info");
        console.log("8. Add agent");
        console.log("9. Pause/Unpause contract");
        console.log("0. Exit");

        const choice = await question("\nChoose operation (0-9): ");

        try {
            switch (choice) {
                case '1':
                    await checkStatus(CryptoDraw, PriceOracle);
                    break;
                case '2':
                    await buyEasyLottoTicket(CryptoDraw);
                    break;
                case '3':
                    await buySuperseteTicket(CryptoDraw);
                    break;
                case '4':
                    await checkTicket(TicketNFT);
                    break;
                case '5':
                    await updatePrice(PriceOracle);
                    break;
                case '6':
                    await createDraw(CryptoDraw);
                    break;
                case '7':
                    await checkDraw(CryptoDraw);
                    break;
                case '8':
                    await addAgent(CryptoDraw);
                    break;
                case '9':
                    await pauseContract(CryptoDraw);
                    break;
                case '0':
                    console.log("👋 Goodbye!");
                    rl.close();
                    return;
                default:
                    console.log("❌ Invalid option");
            }
        } catch (error) {
            console.log("❌ Error:", error.message);
        }
    }
}

async function checkStatus(cryptoDraw, priceOracle) {
    console.log("\n📊 Contract Status:");
    
    const paused = await cryptoDraw.paused();
    console.log("Paused:", paused ? "Yes" : "No");
    
    const onePrice = await priceOracle.getUSDPrice(ethers.constants.AddressZero);
    console.log("ONE Price:", ethers.utils.formatUnits(onePrice, 8), "USD");
    
    const nextDrawId = await cryptoDraw.nextDrawId();
    console.log("Next Draw ID:", nextDrawId.toString());
    
    const ticketCount = await cryptoDraw.totalTickets();
    console.log("Total Tickets Sold:", ticketCount.toString());
}

async function buyEasyLottoTicket(cryptoDraw) {
    console.log("\n🎫 Buy EasyLotto Ticket");
    
    const numbersStr = await question("Enter 15 numbers (1-25), separated by commas: ");
    const numbers = numbersStr.split(',').map(n => parseInt(n.trim()));
    
    if (numbers.length !== 15 || !numbers.every(n => n >= 1 && n <= 25)) {
        console.log("❌ Invalid numbers. Must be 15 unique numbers from 1 to 25.");
        return;
    }
    
    const rounds = parseInt(await question("Number of rounds (1-6): "));
    if (rounds < 1 || rounds > 6) {
        console.log("❌ Invalid rounds. Must be between 1 and 6.");
        return;
    }
    
    const drawId = parseInt(await question("Target draw ID: "));
    const agent = await question("Agent address (or press Enter for none): ");
    
    console.log("🔄 Buying ticket...");
    
    const tx = await cryptoDraw.buyTicket(
        1, // EasyLotto
        numbers,
        rounds,
        drawId,
        agent || ethers.constants.AddressZero,
        { value: ethers.utils.parseEther("0.1") } // Adjust as needed
    );
    
    const receipt = await tx.wait();
    console.log("✅ Ticket purchased! TX:", receipt.transactionHash);
}

async function buySuperseteTicket(cryptoDraw) {
    console.log("\n🎫 Buy SuperSete Ticket");
    
    const numbersStr = await question("Enter 7 digits (0-9), separated by commas: ");
    const numbers = numbersStr.split(',').map(n => parseInt(n.trim()));
    
    if (numbers.length !== 7 || !numbers.every(n => n >= 0 && n <= 9)) {
        console.log("❌ Invalid numbers. Must be 7 digits from 0 to 9.");
        return;
    }
    
    const rounds = parseInt(await question("Number of rounds (1-6): "));
    if (rounds < 1 || rounds > 6) {
        console.log("❌ Invalid rounds. Must be between 1 and 6.");
        return;
    }
    
    const drawId = parseInt(await question("Target draw ID: "));
    const agent = await question("Agent address (or press Enter for none): ");
    
    console.log("🔄 Buying ticket...");
    
    const tx = await cryptoDraw.buyTicket(
        2, // SuperSete
        numbers,
        rounds,
        drawId,
        agent || ethers.constants.AddressZero,
        { value: ethers.utils.parseEther("0.1") } // Adjust as needed
    );
    
    const receipt = await tx.wait();
    console.log("✅ Ticket purchased! TX:", receipt.transactionHash);
}

async function checkTicket(ticketNFT) {
    const ticketId = await question("Enter ticket ID: ");
    
    try {
        const owner = await ticketNFT.ownerOf(ticketId);
        const uri = await ticketNFT.tokenURI(ticketId);
        
        console.log("Owner:", owner);
        console.log("Metadata URI:", uri);
    } catch (error) {
        console.log("❌ Ticket not found or error:", error.message);
    }
}

async function updatePrice(priceOracle) {
    const token = await question("Token address (or 0 for native ONE): ");
    const priceStr = await question("New price in USD (with decimals): ");
    
    const tokenAddress = token === '0' ? ethers.constants.AddressZero : token;
    const price = ethers.utils.parseUnits(priceStr, 8);
    
    console.log("🔄 Updating price...");
    
    const tx = await priceOracle.updatePrice(tokenAddress, price);
    await tx.wait();
    
    console.log("✅ Price updated!");
}

async function createDraw(cryptoDraw) {
    const gameType = parseInt(await question("Game type (1=EasyLotto, 2=SuperSete): "));
    const hoursStr = await question("Hours from now for draw: ");
    
    const drawTime = Math.floor(Date.now() / 1000) + (parseInt(hoursStr) * 3600);
    
    console.log("🔄 Creating draw...");
    
    const tx = await cryptoDraw.createDraw(gameType, drawTime);
    const receipt = await tx.wait();
    
    console.log("✅ Draw created! TX:", receipt.transactionHash);
}

async function checkDraw(cryptoDraw) {
    const drawId = await question("Enter draw ID: ");
    
    try {
        const draw = await cryptoDraw.draws(drawId);
        
        console.log("Game Type:", draw.gameType === 1 ? "EasyLotto" : "SuperSete");
        console.log("Status:", draw.status);
        console.log("Scheduled At:", new Date(draw.scheduledAt * 1000).toLocaleString());
        console.log("Total Pool:", ethers.utils.formatEther(draw.totalPool), "ONE");
        console.log("Ticket Count:", draw.ticketCount.toString());
    } catch (error) {
        console.log("❌ Draw not found or error:", error.message);
    }
}

async function addAgent(cryptoDraw) {
    const agentAddress = await question("Agent address: ");
    const active = await question("Active (y/n): ");
    
    console.log("🔄 Adding agent...");
    
    const tx = await cryptoDraw.setAgent(agentAddress, active.toLowerCase() === 'y');
    await tx.wait();
    
    console.log("✅ Agent updated!");
}

async function pauseContract(cryptoDraw) {
    const action = await question("Pause (p) or Unpause (u): ");
    
    console.log("🔄 Updating contract state...");
    
    let tx;
    if (action.toLowerCase() === 'p') {
        tx = await cryptoDraw.pause();
        console.log("⏸️  Contract paused!");
    } else {
        tx = await cryptoDraw.unpause();
        console.log("▶️  Contract unpaused!");
    }
    
    await tx.wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });