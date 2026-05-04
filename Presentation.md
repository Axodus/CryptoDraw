### **CryptoDraw Project Presentation**

**Overview**

CryptoDraw is a blockchain-based lottery game designed to offer transparency, fairness, and security to players. The game leverages smart contracts, Chainlink VRF (Verifiable Random Function), and Chainlink Automation to ensure random number generation and automated processes. CryptoDraw operates using its native ERC-20 token, and all interactions, including ticket purchases, prize distribution, and agent commissions, are governed by smart contracts on the Ethereum blockchain. This project aims to create an engaging and trustworthy lottery experience for players worldwide.

---

**Core Contracts and Integrations**

1. **ERC-20 Token Integration:**
   CryptoDraw uses a native ERC-20 token for all financial transactions. Players purchase tickets using this token, and all prizes and commissions are also paid in it. This ensures a seamless experience and maintains a single currency environment for the game.

2. **Chainlink VRF Integration:**
   The project uses Chainlink's VRF for secure, tamper-proof randomness in selecting winning numbers. Each lottery draw triggers a request to the Chainlink VRF, which provides a random set of numbers that determines the winning numbers for that round. The randomness is verifiable and cannot be manipulated by any party, including the CryptoDraw team.

3. **Chainlink Automation (Keepers) Integration:**
   Chainlink Keepers automate the game's essential processes, such as checking when to perform a draw and executing it at the scheduled intervals. This removes manual intervention, ensuring that the game runs smoothly and fairly according to predefined rules.

4. **OpenZeppelin Libraries:**
   The project utilizes OpenZeppelin's secure contract libraries, including `Ownable` for ownership management, `AccessControl` for role-based access control, and `ReentrancyGuard` to prevent reentrancy attacks, ensuring the highest levels of security and functionality.

---

## Game Mechanics of CryptoDraw

**CryptoDraw** is a decentralized lottery game that leverages blockchain technology and smart contracts to create a transparent, fair, and secure gaming experience. The game operates on the Ethereum network, utilizing smart contracts to handle ticket sales, prize draws, and payouts.

#### **Core Concepts and Components**

1. **Ticket Purchase**
   - Players participate in CryptoDraw by purchasing tickets. Each ticket allows the player to select a set of numbers, between a minimum (`minNumbers`) and maximum (`maxNumbers`), from a total pool of numbers (`totalNumbers`), which is set to 25 in this game.
   - The price for a ticket is dynamically calculated in the native token (e.g., ETH) based on the USD price using Chainlink's price feed oracle. The ticket cost also varies depending on the number of numbers selected.
   - Players can purchase tickets directly or through authorized agents. If purchased through an agent, the agent earns a commission for each ticket sold.

2. **Prize Pool Accumulation**
   - All the funds from ticket sales are added to the prize pool. A portion of this pool is reserved for the total prize distribution, with other allocations going to various funds:
     - **Project Fund**: For future development and maintenance.
     - **Grant Fund**: For community rewards and incentives.
     - **Operation Fund**: For covering operational costs.

3. **Draw and Random Number Generation**
   - Draws occur at regular intervals (`drawInterval`), currently set to every four days. The draw time is dynamically calculated to occur at midnight based on the blockchain's current timestamp.
   - When it is time for a draw, the Chainlink VRF (Verifiable Random Function) service is used to generate random numbers, ensuring a secure and tamper-proof selection of winning numbers.
   - The draw generates `minNumbers` winning numbers out of the `totalNumbers` available. These numbers are then stored in the `roundWinningNumbers` mapping for the current draw round.

4. **Prize Distribution**
   - After the winning numbers are drawn, the contract checks all purchased tickets for matches with the winning numbers.
   - Players' prizes are calculated based on the number of matches between their chosen numbers and the winning numbers. The total gross prize is a percentage (43.35%) of the prize pool. Prizes are allocated proportionately based on the number of matches.
   - Players can claim their prizes at any time by calling the `claimPrize` function. When a player claims their prize, the smart contract checks their winnings, transfers the amount to their address, and burns their winning tickets (marks them as invalid).

5. **Agent Participation and Commission**
   - Agents are authorized individuals or entities that sell tickets on behalf of the platform. Agents are approved by the contract owner or an admin role and tracked using the `agentStatus` mapping.
   - Each agent receives an 8.61% commission from the total cost of every ticket sold through them. This commission is calculated automatically when a ticket is purchased and added to the agent's total in the `agentCommissions` mapping.
   - Agent commissions are paid automatically when the prizes are distributed. The contract checks the accumulated commissions for each agent and transfers the amount due.

6. **Roles and Permissions**
   - The contract utilizes role-based access control, where specific functions can only be executed by users with certain roles:
     - **Admin Role** (`ADMIN_ROLE`): Can set draw intervals, ticket prices, and manage agent status.
     - **Updater Role** (`UPDATER_ROLE`): Can update certain game parameters.
     - **Default Admin Role**: The contract owner is assigned the highest level of authority and can grant or revoke roles to other addresses.

7. **Contract State Management**
   - The contract has a `paused` state to handle unexpected situations, such as potential exploits or maintenance needs. When paused, certain functions like ticket purchases are temporarily disabled.
   - The contract can be paused or unpaused by an admin, and it emits appropriate events (`ContractPaused` or `ContractUnpaused`) to notify participants.

#### **Security Measures**

- **Reentrancy Guard**: The contract uses `ReentrancyGuard` to prevent reentrancy attacks, particularly when transferring tokens or handling critical operations.
- **Chainlink VRF**: Ensures that random number generation for the draw is secure, tamper-proof, and verifiable, protecting against manipulation or predictability.
- **Access Control**: Implements `AccessControl` from OpenZeppelin to manage roles and restrict access to critical functions, reducing the risk of unauthorized actions.
- **Safe Transfer Mechanisms**: Uses safe transfer functions (`safeTransfer` and `safeTransferFrom`) to ensure secure handling of ERC20 tokens and avoid any unexpected behaviors or failures during token transfers.

#### **Winning and Claiming Prizes**

Winning numbers are determined randomly by the Chainlink VRF service, and players whose tickets match a certain number of these winning numbers are eligible for prizes. The more numbers matched, the larger the prize. Players can claim their winnings through the `claimPrize` function, which checks their earnings, transfers the amount in native tokens to their wallet, and marks their tickets as "used" to prevent double claims.

---

### Prize Distribution

The prize distribution in CryptoDraw is determined by the percentage of the total prize pool allocated to different winners based on the number of matches between their chosen numbers and the winning numbers drawn in each round. The overall distribution is designed to provide a fair reward for players while also accounting for operational costs, project funding, and agent commissions.

#### **Prize Pool Breakdown**

The total prize pool is accumulated from the sale of tickets, and its distribution is broken down into several components. Here is a detailed breakdown:

| **Component**                | **Percentage** | **Description**                                                                 |
|------------------------------|----------------|---------------------------------------------------------------------------------|
| **Gross Prize Pool**         | 43.35%         | Allocated for player prizes based on the number of matches with the winning numbers. |
| **Agents' Commission**       | 8.61%          | Allocated for agents as commission for each ticket sold through them.            |
| **Project Fund**             | 20%            | Reserved for future development, marketing, and maintenance of the platform.    |
| **Grant Fund**               | 10%            | Used for community rewards, grants, and incentives.                             |
| **Operational Fund**         | 18.04%         | Covers the costs related to platform operations, infrastructure, and security.  |

#### **Player Prize Distribution**

The **gross prize pool** (43.35% of the total prize pool) is distributed among players based on the number of matches between their chosen numbers and the winning numbers. Here's an example breakdown for a simplified scenario:

| **Matches** | **Percentage of Gross Prize Pool** | **Description**                           |
|-------------|-----------------------------------|-------------------------------------------|
| 15 Matches  | 50%                               | Jackpot prize for matching all 15 winning numbers. |
| 14 Matches  | 20%                               | Prize for matching 14 out of 15 winning numbers.   |
| 13 Matches  | 15%                               | Prize for matching 13 out of 15 winning numbers.   |
| 12 Matches  | 10%                               | Prize for matching 12 out of 15 winning numbers.   |
| 11 Matches  | 5%                                | Prize for matching 11 out of 15 winning numbers.   |

If no tickets match 15 winning numbers (the jackpot), the portion allocated for that prize may either roll over to the next draw, or it can be redistributed among the other prize categories based on predefined rules set by the contract.

#### **Example Calculation**

Assume a total prize pool of 1,000,000 tokens:

- **Gross Prize Pool**: 1,000,000 * 43.35% = 433,500 tokens
  - **15 Matches**: 433,500 * 50% = 216,750 tokens
  - **14 Matches**: 433,500 * 20% = 86,700 tokens
  - **13 Matches**: 433,500 * 15% = 65,025 tokens
  - **12 Matches**: 433,500 * 10% = 43,350 tokens
  - **11 Matches**: 433,500 * 5% = 21,675 tokens

#### **Agent Commission Example**

Agents earn a base commission of 8.61% from every ticket sold through them. For example, if 100,000 tokens worth of tickets are sold by an agent:

- **Agent's Commission**: 100,000 * 8.61% = 8,610 tokens

The agent can claim this commission at any time by invoking the `getAgentCommission` function, which checks and transfers the commission to the agent's wallet.

#### **Key Points**

1. The prize pool distribution ensures a substantial amount is reserved for players, incentivizing participation.
2. A portion is allocated to agents to reward their efforts in ticket sales.
3. Remaining funds are distributed to support the platform's growth, community engagement, and operational stability.

This balanced distribution strategy aims to create a sustainable ecosystem, attracting both players and agents while maintaining platform health and growth.

- **Agent System:**  
Agents play a vital role in promoting CryptoDraw by selling tickets and onboarding new players. Agents receive commissions based on their sales performance and the total number of tickets sold. They are managed through a dedicated agent registration and monitoring system, which ensures only qualified and active agents participate. (see: AgentsOverview.md)

---

### Winning Criteria in CryptoDraw

In CryptoDraw, the winning criteria are determined based on the number of matches between the numbers chosen by a player and the randomly generated winning numbers drawn at the end of each draw round. The game rewards players who successfully match the required number of winning numbers, with larger prizes allocated to those who match a greater number of numbers.

#### **How Winning Numbers are Determined**

1. **Number Selection by Players**:  
   Each player purchases a ticket and selects a set of numbers. Players must choose a minimum of 15 numbers and can select up to 20 numbers from a total pool of 25 possible numbers.

2. **Random Number Generation**:  
   At the end of each draw round, the Chainlink Verifiable Random Function (VRF) is used to generate a set of 15 random winning numbers from the total pool of 25 numbers. This ensures the fairness and randomness of the draw.

3. **Matching Player Numbers to Winning Numbers**:  
   The numbers chosen by each player are then compared to the randomly generated set of winning numbers.

#### **Winning Criteria Based on Matches**

To determine if a player has won, the following criteria are used:

- **15 Matches (Jackpot)**:  
  The player must match all 15 winning numbers exactly. This is the highest prize tier, often referred to as the "jackpot". A player who matches all 15 numbers wins the largest share of the prize pool allocated for player prizes.

- **14 Matches**:  
  A player who matches 14 out of the 15 winning numbers is eligible for the second-highest prize tier. The prize allocated to this tier is a percentage of the gross prize pool, usually lower than the jackpot prize.

- **13 Matches**:  
  Players who match 13 of the 15 winning numbers win a prize that is lower than the one for 14 matches but still significant. This falls under the third-highest prize tier.

- **12 Matches**:  
  Matching 12 out of the 15 winning numbers places the player in the fourth prize tier. The amount won will be less than that for 13 matches but still provides a notable reward.

- **11 Matches**:  
  Players who match 11 of the 15 winning numbers qualify for the lowest prize tier. The prize for this tier is smaller, providing a consolation reward for achieving a partial match.

#### **Special Conditions and Rules**

1. **Multiple Winners in a Tier**:  
   If multiple players achieve the same number of matches for a particular prize tier, the prize allocated for that tier is distributed equally among all qualifying players.

2. **No Winners for a Tier**:  
   If no player achieves a match that qualifies for a particular tier (e.g., no one matches all 15 numbers for the jackpot), the portion of the prize allocated to that tier may either:
   - **Roll Over** to the next draw, increasing the potential jackpot for future rounds.
   - **Redistribute** to the lower tiers, enhancing the prizes for other winning categories.

3. **Validity of Tickets**:  
   Only tickets that are marked as valid (not expired or claimed) are eligible for prize consideration. Players must claim their winnings before the tickets are deemed invalid or after a certain draw round, whichever is earlier.

### Winning Probability Considerations for CryptoDraw

The probability of winning in CryptoDraw is directly related to the number of numbers a player chooses and how many of those numbers match the winning numbers drawn in each round. As players choose more numbers, their chances of winning improve, but the cost of the ticket increases accordingly. Here’s a detailed breakdown of the prize tiers, probabilities, and associated costs for different betting options in the game:

#### Prize Tiers and Winning Probability

The table below illustrates the different prize tiers, the number of combinations (or "bets") based on the chosen numbers, and the corresponding cost to play.

| **Prize Tiers**   | **Simple Bets** | **15 Numbers** (1 Bet) | **16 Numbers** (16 Bets) | **17 Numbers** (136 Bets) | **18 Numbers** (816 Bets) | **19 Numbers** (3,876 Bets) | **20 Numbers** (15,504 Bets) |
|-------------------|-----------------|------------------------|---------------------------|----------------------------|----------------------------|------------------------------|-------------------------------|
| **15 Matches**    | Odds of Winning | 3,268,760              | 204,298                   | 24,035                     | 4,006                      | 843                          | 211                           |
| **14 Matches**    | Odds of Winning | 21,792                 | 3,027                     | 601                        | 153                        | 47                           | 17                            |
| **13 Matches**    | Odds of Winning | 692                    | 162                       | 49                         | 18                         | 8                            | 4.2                           |
| **12 Matches**    | Odds of Winning | 60                     | 21                        | 9                          | 5                          | 3.2                          | 2.6                           |
| **11 Matches**    | Odds of Winning | 11                     | 6                         | 4                          | 3                          | 2.9                          | 3.9                           |
| **Price to Pay**  | Cost per Bet    | 1 x $3.00 = $3.00      | 16 x $3.00 = $48.00       | 136 x $3.00 = $408.00      | 816 x $3.00 = $2,448.00    | 3,876 x $3.00 = $11,628.00   | 15,504 x $3.00 = $46,512.00   |

#### Explanation of the Table

- **15 Matches (Jackpot)**: The odds of winning the jackpot by matching all 15 numbers are highest when a player selects more numbers (e.g., 20 numbers). However, the cost of placing such a bet also increases significantly.
  
- **14 to 11 Matches**: As the number of matches decreases, the odds improve, but the prizes for these tiers are smaller. Players have higher chances of matching fewer numbers, which provides a balance between lower odds of winning the jackpot and higher odds of winning smaller prizes.

- **Price to Pay**: The total cost for each betting option is calculated based on the number of combinations (bets) a player needs to cover all possible ways of selecting the required number of numbers out of 25. For example, choosing 20 numbers covers 15,504 combinations, costing $46,512 if each bet costs $3.

#### Winning Strategy

1. **Higher Chances with More Numbers**: Players who wish to maximize their odds of winning any prize should choose a higher number of numbers (up to 20). This strategy increases the number of combinations and, consequently, the chances of matching more numbers.
  
2. **Cost-Benefit Analysis**: While selecting more numbers improves the probability of winning, it also raises the cost exponentially. Players should balance the number of numbers selected with their budget and desired risk level.


In CryptoDraw, winning depends on the combination of chosen numbers and the draw results. Players must weigh the potential for higher winnings against the increased costs associated with covering more combinations to enhance their chances of winning across various prize tiers.

In summary, players in CryptoDraw win based on the number of matches between their chosen numbers and the winning numbers drawn. The more numbers a player matches, the higher their prize. The game offers multiple prize tiers to ensure that several levels of matching numbers can still provide rewards, thereby maintaining a fair and engaging experience for all participants.

---
### Security Measures and Fairness in CryptoDraw

CryptoDraw ensures a high level of security and fairness for all participants by incorporating advanced blockchain technology, smart contract design, and decentralized protocols. Here’s a detailed explanation of the various mechanisms and policies that guarantee the safety, integrity, and transparency of the game.

#### Security Measures

**Smart Contract Security**:  
   The CryptoDraw game is built on Ethereum's blockchain using Solidity smart contracts. These contracts are meticulously audited and designed to eliminate vulnerabilities like reentrancy attacks, integer overflows/underflows, and other common exploits. Using industry-standard libraries such as OpenZeppelin ensures adherence to best practices for secure coding.

**Role-Based Access Control (RBAC)**:  
   The contract utilizes `AccessControl` from OpenZeppelin to define specific roles (`ADMIN_ROLE` and `UPDATER_ROLE`) for different functions within the contract. This restricts sensitive operations, such as pausing the contract or updating game parameters, to authorized personnel only, preventing unauthorized access or malicious activities.

**Reentrancy Protection**:  
   To prevent reentrancy attacks, CryptoDraw uses the `ReentrancyGuard` modifier on functions involving critical operations such as fund transfers. This measure ensures that a function cannot be repeatedly called before the previous execution is completed, maintaining the integrity of state changes and preventing double-spending exploits.

**Chainlink VRF (Verifiable Random Function) Integration**:  
   The randomness for drawing the winning numbers is generated using Chainlink’s Verifiable Random Function (VRF), a secure and tamper-proof source of randomness. The VRF ensures that the random numbers are not manipulated or predictable, making the game fair and transparent. Chainlink VRF provides cryptographic proof that the random number generation process is both verifiable and unbiased.

**Chainlink Price Feeds**:  
   The price of tickets is pegged to USD, and conversions to the native token are conducted using Chainlink’s decentralized price feeds. This mechanism protects against volatility and manipulation of price data, ensuring that ticket prices remain fair and consistent with real-world values.

**Automated Smart Contract Pausing**:  
   In case of a detected threat or anomaly, the contract can be automatically paused to prevent further ticket purchases or fund withdrawals. This pause functionality, controlled by authorized roles, allows for an immediate response to potential security threats, safeguarding user funds and the overall system.

**Non-Custodial Funds Management**:  
   Funds collected from ticket sales and stored in the contract are managed by the smart contract itself, with no central authority or intermediaries having control over them. This non-custodial model eliminates the risk of fund misappropriation by a third party.

**Regular Security Audits**:  
   CryptoDraw undergoes regular security audits by independent third-party firms to identify and fix any vulnerabilities in the contract code. These audits are documented, and any findings are transparently shared with the community to maintain trust and integrity.

#### Fairness Measures

1. **Decentralized and Transparent Draws**:  
   The drawing process for winning numbers is decentralized and fully transparent, using Chainlink VRF. All players can verify the randomness and fairness of the draw on the blockchain. The draw results and their associated proofs are publicly available, allowing anyone to verify that they were generated correctly.

2. **Immutable Rules and Game Logic**:  
   The rules of the game, such as the ticket price, prize distribution, and agent commissions, are encoded in the smart contract. These rules are immutable once deployed, ensuring no changes can be made without proper authorization and community consent. This immutability guarantees that all players are subject to the same conditions.

3. **Automated Prize Distribution**:  
   All prize distributions, including winnings and agent commissions, are automated and governed by the smart contract. This removes any potential bias or manual intervention in the distribution process. The contract calculates and distributes winnings based on predefined criteria, ensuring fairness for all participants.

4. **Open Source and Verifiable Code**:  
   The CryptoDraw smart contract code is open source, allowing any participant or developer to review and verify its integrity. This openness promotes transparency and trust within the community, as anyone can audit the code for fairness and correctness.

5. **Anti-Collusion Measures**:  
   The use of Chainlink VRF and decentralized mechanisms makes it virtually impossible for any party to manipulate or predict the draw outcome. The randomness is verifiable on-chain, eliminating any opportunities for collusion or insider manipulation.

6. **Agent and Player Activity Tracking**:  
   The contract tracks all player and agent activities, including ticket purchases, agent commissions, and winnings, in an open ledger on the blockchain. This transparency helps to prevent fraudulent behavior and ensures that all transactions and activities are verifiable.

7. **Periodic Game Audits and Updates**:  
   The game undergoes periodic audits to ensure compliance with fairness standards and blockchain best practices. Updates and enhancements are made transparently, with community input and consensus, to keep the game balanced, fair, and secure.

CryptoDraw’s commitment to security and fairness is evident in its use of blockchain technology, decentralized randomness, transparent smart contract logic, and robust access controls. By leveraging these measures, the game ensures that all participants enjoy a fair, secure, and trustworthy experience.

---

**Financials and Operational Transparency**

CryptoDraw maintains transparency in its financial and operational processes:

- **Dynamic Pricing:**  
  Ticket prices are pegged to USD and calculated in real-time using Chainlink’s decentralized price feeds, providing a stable pricing mechanism unaffected by the native token’s volatility.

- **Automated Prize Distribution:**  
  Prizes are calculated and distributed automatically, ensuring winners receive their rewards promptly. Players can claim their prizes through a secure, non-reentrant process that protects both the game and its participants.

- **Funds Allocation:**  
  The game allocates its funds into three primary categories: project development, grants, and operational expenses. Each allocation is designed to ensure the long-term sustainability and growth of CryptoDraw while also funding new initiatives and community engagement.

---

**How to Play CryptoDraw**

To participate, players need to acquire the native ERC-20 token and use it to purchase lottery tickets through the CryptoDraw platform. Each ticket allows players to choose their numbers. Once the draw interval concludes, Chainlink VRF generates the winning numbers. Players matching the winning numbers receive their prizes directly to their wallets.

Players can also become agents, sell tickets, and earn commissions by promoting CryptoDraw to their networks, further increasing engagement and expanding the game’s reach.

---

**Conclusion**

CryptoDraw is a secure, fair, and transparent lottery game that leverages cutting-edge blockchain technology and decentralized oracles to offer a reliable and exciting experience for players and agents alike. Its innovative use of smart contracts, secure random number generation, and automation makes it a pioneering platform in the world of decentralized gaming.