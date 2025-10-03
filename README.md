## CryptoDraw | [![Codacy Badge](https://app.codacy.com/project/badge/Grade/cb5a0c53ec754a328195c831f536a27b)](https://app.codacy.com/gh/Axodus/CryptoDraw/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

On-chain lottery platform with NFT tickets, oracle-based pricing, and a built-in agent commission system. CryptoDraw currently supports two games: SuperSeven and EasyLotto.

> Note: This README describes the current V2 smart contract architecture. Randomness is pluggable; VRF integration is planned. In V2, draws are closed by an operator with a deterministic seed input.

---

## Highlights

- Two lottery games out of the box:
  - SuperSeven: pick 7 digits (0–9)
  - EasyLotto: pick 15 numbers (1–25)
- NFT tickets (soulbound) via `TicketNFT` for transparent, immutable ownership
- Price-oracle driven USD pricing converted to the selected payment token
- Payments with native token or supported ERC-20 tokens
- Revenue distribution with configurable splits (default: prizes 43.35%, agent 8.61%)
- Agent system with commission accrual, withdrawal, and suspension controls
- Role-based access control (Admin, Operator, Agent) and pausability

---

## How it works (V2)

1) Configure games and supported tokens
- Admin sets ticket price in USD (18 decimals) and draw interval per game
- Admin enables supported payment tokens (native or ERC-20)

2) Buy tickets
- Player chooses game and numbers, selects rounds, and pays in the chosen token
- Price in token is derived from USD price using a configured price oracle
- An NFT ticket is minted to the buyer (non-transferable)
- Optional: purchases can include an Agent address to accrue commission

3) Close the draw
- Operator closes a draw providing a deterministic seed: `closeDraw(uint8,uint32,uint256)`
- Draw status transitions to COMPLETED; winning numbers are derived on-chain from the seed

4) Revenue and commissions
- Funds are split according to the contract’s revenue configuration
- Agents accrue commission in USD terms; withdrawals are supported when the contract holds enough balance

---

## Contracts overview

- CryptoDraw (V2): core lottery logic, draw lifecycle, pricing, revenue splits, agent commissions, access control
- TicketNFT: mints non-transferable tickets with packed numbers and draw metadata
- AgentProxy: legacy/auxiliary component for backward compatibility in certain flows
- Price oracle adapter: external or simple contract to store USD prices and token decimals for conversions

> Legacy/experimental components may exist in the repository; the V2 flow centers on `CryptoDraw` and `TicketNFT`.

---

## Quickstart

Prerequisites
- Node.js 18+
- pnpm or npm

Install
```bash
pnpm install
# or
npm install
```

Compile
```bash
npx hardhat compile
```

Run tests
```bash
npx hardhat test
```

Local deploy (example)
```bash
npx hardhat run scripts/deploy.js
```

> Networks and environment configuration depend on your Hardhat setup; adjust as needed.

---

## Gameplay details

- SuperSeven
  - Choose exactly 7 digits between 0 and 9
- EasyLotto
  - Choose exactly 15 unique numbers between 1 and 25

Numbers are validated and packed on-chain. Invalid counts or out-of-range values will revert.

---

## Revenue and commissions

Default revenue split (basis points, configurable):
- Prizes: 4335 (43.35%)
- Agent commission: 861 (8.61%)
- Remaining distribution goes to project/operation funds as configured

Agents
- Admin can suspend or update agent settings
- Commissions accrue per purchase when an agent is provided by the buyer
- Agents can withdraw accrued commissions when balance is available

---

## Repository structure (simplified)

- `contracts/`
  - `CryptoDraw.sol` (V2 contract, named `CryptoDraw`)
  - `TicketNFT.sol`
  - `AgentProxy.sol` (legacy/auxiliary)
  - `Documentation.md`
- `scripts/`
  - `deploy.js`
  - `parse_config.py`
- `test/` (if present): unit and integration tests for V2 and components
- `hardhat.config.js`, `package.json`, `requirements.txt`

---

## Security and status

- This project is not yet audited; use at your own risk
- Access control, pausability, and simple reentrancy protections are in place where relevant
- Please open issues for any bugs or vulnerabilities you find

---

## Roadmap

- Pluggable RNG providers and VRF integration
- Expanded prize tiers and detailed distribution reports
- Frontend dApp with wallet flows and ticket explorer
- Additional tokens and network configurations

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
