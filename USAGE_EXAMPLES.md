# CryptoDraw Usage Examples

## Quick Start Guide

This document provides practical examples for interacting with CryptoDraw contracts.

## Prerequisites

```javascript
const { ethers } = require("ethers");

// Contract addresses (update after deployment)
const CRYPTO_DRAW_ADDRESS = "0x...";
const TICKET_NFT_ADDRESS = "0x...";
const PRICE_ORACLE_ADDRESS = "0x...";

// ABIs (import from artifacts)
const CryptoDrawABI = require("./artifacts/contracts/CryptoDrawV2.sol/CryptoDraw.json").abi;
const TicketNFTABI = require("./artifacts/contracts/TicketNFT.sol/TicketNFT.json").abi;
const PriceOracleABI = require("./artifacts/contracts/PriceOracle.sol/PriceOracle.json").abi;
```

## For Users (Players)

### 1. Buy an EasyLotto Ticket (Native ONE)

```javascript
async function buyEasyLottoTicket() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // Game type: 0 = SUPERSEVEN, 1 = EASYLOTTO
  const gameType = 1; // EasyLotto
  
  // Select 15 numbers from 1-25
  const numbers = [1, 2, 3, 5, 7, 11, 13, 15, 17, 19, 21, 22, 23, 24, 25];
  
  // Buy for 1 round
  const rounds = 1;
  
  // Pay with native ONE (address(0))
  const paymentToken = ethers.constants.AddressZero;
  
  // Get ticket price
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, provider);
  const ticketPriceUSD = ethers.utils.parseEther("1.0"); // $1.00
  const paymentAmount = await priceOracle.convertFromUSD(paymentToken, ticketPriceUSD);
  
  // Add 5% slippage protection
  const maxPayment = paymentAmount.mul(105).div(100);
  
  // No agent
  const agent = ethers.constants.AddressZero;
  
  // Buy ticket
  const tx = await cryptoDraw.buyTicket(
    gameType,
    numbers,
    rounds,
    paymentToken,
    maxPayment,
    agent,
    { value: paymentAmount } // Send ONE with transaction
  );
  
  const receipt = await tx.wait();
  console.log("Ticket purchased! TX:", receipt.transactionHash);
  
  // Get ticket ID from event
  const event = receipt.events.find(e => e.event === "TicketPurchased");
  const ticketId = event.args.ticketId;
  console.log("Ticket ID:", ticketId.toString());
  
  return ticketId;
}
```

### 2. Buy a SuperSeven Ticket (wONE Token)

```javascript
async function buySuperSevenTicket() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // Game type: SUPERSEVEN
  const gameType = 0;
  
  // Select 7 columns (0-9 each)
  const columns = [3, 0, 9, 7, 1, 2, 4];
  
  // Buy for 3 rounds (ticket valid for 3 consecutive draws)
  const rounds = 3;
  
  // Pay with wONE
  const wONE_ADDRESS = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a";
  const paymentToken = wONE_ADDRESS;
  
  // Get payment amount
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, provider);
  const ticketPriceUSD = ethers.utils.parseEther("1.0");
  const totalPriceUSD = ticketPriceUSD.mul(rounds); // $3.00 for 3 rounds
  const paymentAmount = await priceOracle.convertFromUSD(paymentToken, totalPriceUSD);
  const maxPayment = paymentAmount.mul(105).div(100);
  
  // Approve wONE
  const wONE = new ethers.Contract(wONE_ADDRESS, ["function approve(address,uint256)"], signer);
  await (await wONE.approve(CRYPTO_DRAW_ADDRESS, paymentAmount)).wait();
  
  // Buy ticket
  const agent = ethers.constants.AddressZero;
  const tx = await cryptoDraw.buyTicket(
    gameType,
    columns,
    rounds,
    paymentToken,
    maxPayment,
    agent
  );
  
  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === "TicketPurchased");
  const ticketId = event.args.ticketId;
  
  console.log("SuperSeven ticket purchased! ID:", ticketId.toString());
  return ticketId;
}
```

### 3. Check Ticket Information

```javascript
async function getTicketInfo(ticketId) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const ticketNFT = new ethers.Contract(TICKET_NFT_ADDRESS, TicketNFTABI, provider);
  
  const ticket = await ticketNFT.getTicket(ticketId);
  
  console.log("Ticket Info:");
  console.log("- Player:", ticket.player);
  console.log("- Game:", ticket.game === 0 ? "SuperSeven" : "EasyLotto");
  console.log("- Numbers (packed):", ticket.numbersPacked);
  console.log("- Draw Round:", ticket.drawRound.toString());
  console.log("- Rounds Bought:", ticket.roundsBought);
  console.log("- Rounds Remaining:", ticket.roundsRemaining);
  console.log("- Status:", ["Active", "Expired", "Redeemed", "Burned"][ticket.status]);
  
  return ticket;
}
```

### 4. Claim Prize

```javascript
async function claimPrize(ticketId) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // Claim prize (adds to withdrawable balance)
  const tx = await cryptoDraw.claimPrize(ticketId);
  const receipt = await tx.wait();
  
  console.log("Prize claimed! TX:", receipt.transactionHash);
  
  // Check withdrawable balance
  const balance = await cryptoDraw.withdrawableBalances(await signer.getAddress());
  console.log("Withdrawable balance:", ethers.utils.formatEther(balance), "ONE");
}
```

### 5. Withdraw Prize

```javascript
async function withdrawPrize() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  const address = await signer.getAddress();
  const balance = await cryptoDraw.withdrawableBalances(address);
  
  if (balance.eq(0)) {
    console.log("No balance to withdraw");
    return;
  }
  
  console.log("Withdrawing:", ethers.utils.formatEther(balance), "ONE");
  
  const tx = await cryptoDraw.withdrawPrize();
  const receipt = await tx.wait();
  
  console.log("Prize withdrawn! TX:", receipt.transactionHash);
}
```

## For Agents

### 1. Buy Ticket on Behalf of User (with commission)

```javascript
async function buyTicketAsAgent(userAddress) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  const agentAddress = await signer.getAddress();
  
  // Agent must have AGENT_ROLE
  const AGENT_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AGENT_ROLE"));
  const hasRole = await cryptoDraw.hasRole(AGENT_ROLE, agentAddress);
  
  if (!hasRole) {
    throw new Error("Not authorized as agent");
  }
  
  // Buy ticket with agent parameter
  const gameType = 1; // EasyLotto
  const numbers = [1, 2, 3, 5, 7, 11, 13, 15, 17, 19, 21, 22, 23, 24, 25];
  const rounds = 1;
  const paymentToken = ethers.constants.AddressZero;
  
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, provider);
  const ticketPriceUSD = ethers.utils.parseEther("1.0");
  const paymentAmount = await priceOracle.convertFromUSD(paymentToken, ticketPriceUSD);
  const maxPayment = paymentAmount.mul(105).div(100);
  
  const tx = await cryptoDraw.buyTicket(
    gameType,
    numbers,
    rounds,
    paymentToken,
    maxPayment,
    agentAddress, // Agent gets commission
    { value: paymentAmount }
  );
  
  const receipt = await tx.wait();
  console.log("Ticket purchased with agent commission");
  
  // Check commission
  const commission = await cryptoDraw.agentCommissions(agentAddress);
  console.log("Total commission:", ethers.utils.formatEther(commission), "ONE");
}
```

### 2. Withdraw Agent Commission

```javascript
async function withdrawAgentCommission() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  const agentAddress = await signer.getAddress();
  const commission = await cryptoDraw.agentCommissions(agentAddress);
  
  if (commission.eq(0)) {
    console.log("No commission to withdraw");
    return;
  }
  
  console.log("Withdrawing commission:", ethers.utils.formatEther(commission), "ONE");
  
  const tx = await cryptoDraw.withdrawAgentCommission();
  const receipt = await tx.wait();
  
  console.log("Commission withdrawn! TX:", receipt.transactionHash);
}
```

## For Administrators

### 1. Add Supported Token

```javascript
async function addSupportedToken(tokenAddress, decimals, initialPriceUSD) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, signer);
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // Add to PriceOracle
  console.log("Adding token to PriceOracle...");
  let tx = await priceOracle.addToken(tokenAddress, decimals, initialPriceUSD);
  await tx.wait();
  
  // Add to CryptoDraw
  console.log("Adding token to CryptoDraw...");
  tx = await cryptoDraw.setSupportedToken(tokenAddress, true);
  await tx.wait();
  
  console.log("Token added successfully!");
}
```

### 2. Update Token Price

```javascript
async function updateTokenPrice(tokenAddress, newPriceUSD) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, signer);
  
  const tx = await priceOracle.updatePrice(tokenAddress, newPriceUSD);
  await tx.wait();
  
  console.log("Price updated for", tokenAddress);
  console.log("New price:", ethers.utils.formatEther(newPriceUSD), "USD");
}
```

### 3. Batch Update Prices

```javascript
async function batchUpdatePrices(tokens, prices) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const priceOracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PriceOracleABI, signer);
  
  // tokens: array of token addresses
  // prices: array of prices (in 18 decimals)
  
  const tx = await priceOracle.updatePrices(tokens, prices);
  await tx.wait();
  
  console.log(`Updated ${tokens.length} token prices`);
}
```

### 4. Grant Agent Role

```javascript
async function grantAgentRole(agentAddress) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  const AGENT_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AGENT_ROLE"));
  
  const tx = await cryptoDraw.grantRole(AGENT_ROLE, agentAddress);
  await tx.wait();
  
  console.log("Agent role granted to", agentAddress);
}
```

### 5. Configure Game Settings

```javascript
async function configureGame(gameType, ticketPriceUSD, drawInterval, enabled) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // gameType: 0 = SUPERSEVEN, 1 = EASYLOTTO
  // ticketPriceUSD: in 18 decimals (e.g., ethers.utils.parseEther("2.0"))
  // drawInterval: in seconds (e.g., 7 * 24 * 60 * 60 for 1 week)
  // enabled: boolean
  
  const tx = await cryptoDraw.setGameConfig(
    gameType,
    ticketPriceUSD,
    drawInterval,
    enabled
  );
  await tx.wait();
  
  console.log("Game config updated");
}
```

### 6. Update Revenue Configuration

```javascript
async function updateRevenueConfig() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // All percentages in basis points (10000 = 100%)
  const revenueConfig = {
    prizesPercent: 4335,         // 43.35%
    projectFundPercent: 2000,    // 20%
    grantFundPercent: 1500,      // 15%
    operationPercent: 1304,      // 13.04%
    agentCommissionPercent: 861  // 8.61%
  };
  
  // Total must equal 10000 (100%)
  const total = Object.values(revenueConfig).reduce((a, b) => a + b, 0);
  if (total !== 10000) {
    throw new Error("Revenue percentages must sum to 100%");
  }
  
  const tx = await cryptoDraw.setRevenueConfig(revenueConfig);
  await tx.wait();
  
  console.log("Revenue config updated");
}
```

### 7. Pause Contract (Emergency)

```javascript
async function pauseContract() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  const tx = await cryptoDraw.pause();
  await tx.wait();
  
  console.log("Contract paused");
}
```

### 8. Emergency Withdrawal

```javascript
async function emergencyWithdraw(tokenAddress, toAddress, amount) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // tokenAddress: address(0) for native ONE, or ERC20 token address
  // toAddress: destination wallet
  // amount: amount to withdraw (in wei)
  
  const tx = await cryptoDraw.emergencyWithdraw(tokenAddress, toAddress, amount);
  await tx.wait();
  
  console.log("Emergency withdrawal completed");
}
```

## For Operators

### 1. Close Draw and Determine Winners

```javascript
async function closeDraw(gameType, drawId, randomness) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, signer);
  
  // gameType: 0 = EASYLOTTO, 1 = SUPERSEVEN
  // drawId: draw ID to close
  // randomness: random value from VRF or other source
  
  const tx = await cryptoDraw.closeDraw(gameType, drawId, randomness);
  const receipt = await tx.wait();
  
  // Get winning numbers from event
  const event = receipt.events.find(e => e.event === "DrawCompleted");
  const winningNumbers = event.args.winningNumbers;
  
  console.log("Draw closed! Winning numbers (packed):", winningNumbers);
  
  return winningNumbers;
}
```

## Utility Functions

### 1. Pack EasyLotto Numbers

```javascript
function packEasyLottoNumbers(numbers) {
  // numbers: array of 15-20 numbers (1-25)
  let packed = 0;
  for (const num of numbers) {
    if (num < 1 || num > 25) {
      throw new Error("Invalid number: " + num);
    }
    packed |= (1 << (num - 1));
  }
  return packed;
}
```

### 2. Unpack EasyLotto Numbers

```javascript
function unpackEasyLottoNumbers(packed) {
  const numbers = [];
  for (let i = 0; i < 25; i++) {
    if (packed & (1 << i)) {
      numbers.push(i + 1);
    }
  }
  return numbers;
}
```

### 3. Pack SuperSeven Columns

```javascript
function packSuperSevenColumns(columns) {
  // columns: array of 7 digits (0-9)
  if (columns.length !== 7) {
    throw new Error("SuperSeven requires exactly 7 columns");
  }
  
  let packed = 0;
  for (let i = 0; i < 7; i++) {
    if (columns[i] < 0 || columns[i] > 9) {
      throw new Error("Invalid digit: " + columns[i]);
    }
    packed |= (columns[i] << (i * 4));
  }
  return packed;
}
```

### 4. Unpack SuperSeven Columns

```javascript
function unpackSuperSevenColumns(packed) {
  const columns = [];
  for (let i = 0; i < 7; i++) {
    const digit = (packed >> (i * 4)) & 0x0F;
    columns.push(digit);
  }
  return columns;
}
```

## Event Listening

### Listen for Ticket Purchases

```javascript
function listenForTicketPurchases() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, provider);
  
  cryptoDraw.on("TicketPurchased", (ticketId, player, game, drawId, paymentToken, paymentAmount, agent) => {
    console.log("New ticket purchased!");
    console.log("- Ticket ID:", ticketId.toString());
    console.log("- Player:", player);
  console.log("- Game:", game === 0 ? "SuperSeven" : "EasyLotto");
    console.log("- Draw ID:", drawId);
    console.log("- Payment:", ethers.utils.formatEther(paymentAmount));
    console.log("- Agent:", agent);
  });
}
```

### Listen for Draw Completions

```javascript
function listenForDrawCompletions() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const cryptoDraw = new ethers.Contract(CRYPTO_DRAW_ADDRESS, CryptoDrawABI, provider);
  
  cryptoDraw.on("DrawCompleted", (game, drawId, winningNumbers) => {
    console.log("Draw completed!");
  console.log("- Game:", game === 0 ? "SuperSeven" : "EasyLotto");
    console.log("- Draw ID:", drawId);
    console.log("- Winning numbers (packed):", winningNumbers);
    
    // Unpack numbers
    if (game === 1) { // EasyLotto
      const numbers = unpackEasyLottoNumbers(winningNumbers);
      console.log("- Numbers:", numbers.join(", "));
    } else { // SuperSeven
      const columns = unpackSuperSevenColumns(winningNumbers);
      console.log("- Columns:", columns.join(", "));
    }
  });
}
```

## Error Handling

```javascript
async function handleTransaction(txPromise) {
  try {
    const tx = await txPromise;
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    return receipt;
  } catch (error) {
    if (error.code === 4001) {
      console.error("User rejected transaction");
    } else if (error.code === -32603) {
      console.error("Internal error:", error.message);
    } else {
      console.error("Transaction failed:", error);
    }
    throw error;
  }
}
```

## Complete Example: Buy Ticket and Check Result

```javascript
async function completeExample() {
  // 1. Buy ticket
  console.log("Step 1: Buying ticket...");
  const ticketId = await buyEasyLottoTicket();
  
  // 2. Wait for draw (in practice, this happens periodically)
  console.log("Step 2: Waiting for draw...");
  // ... time passes ...
  
  // 3. Check if won
  console.log("Step 3: Checking ticket...");
  const ticket = await getTicketInfo(ticketId);
  
  if (ticket.status === 2) { // REDEEMED
    console.log("Already redeemed!");
  } else {
    // Try to claim
    try {
      await claimPrize(ticketId);
      console.log("Prize claimed!");
      
      // 4. Withdraw
      await withdrawPrize();
      console.log("Prize withdrawn!");
    } catch (error) {
      console.log("No prize or already claimed");
    }
  }
}
```

---

## Notes

- All amounts in USD use 18 decimals (e.g., $1.00 = `1 * 10^18`)
- Native ONE is represented as `address(0)` or `ethers.constants.AddressZero`
- Always add slippage protection when buying tickets
- Check token approvals before ERC20 transactions
- Monitor gas prices on Harmony
- Test on testnet before mainnet

For more details, see:
- IMPLEMENTATION.md - Technical documentation
- MIGRATION.md - Migration guide
- IMPLEMENTATION_SUMMARY.md - Quick reference
