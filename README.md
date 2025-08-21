# Ethereum Baseball League (EBL)

## Technical Overview

Ethereum Baseball League (EBL) is a competitive PvP sports ownership and business simulator.  
Teams and in-game currency (Diamonds) are represented as Ethereum assets, while all simulation and gameplay run off-chain for performance.

This document provides a technical overview of the stack plus quick-start steps and environment file examples.

---

## Core Technologies

- **Runtime:** Node.js (TypeScript, ESM modules)
- **Frameworks:** Express (API/web server), Framework7 (frontend mobile/web UI)
- **Bundling:** Webpack (multiple configs: production, web, engine, dev)
- **Database:** MySQL 8
- **ORM:** Sequelize + sequelize-typescript
- **Smart Contracts:** Solidity (Hardhat + OpenZeppelin)
- **Testing:** Mocha, Chai, ts-mockito, Hardhat test suite

---

## Authentication

- **Discord OAuth2** (via `passport-discord-auth`) with refresh support (`passport-oauth2-refresh`)
- **Ethereum wallet signature verification** (custom Passport strategy using EIP-191 `personal_sign`-style messages)

---

## Web & UI

- **Templating:** Eta (server-rendered views), HTML & CSS loaders via Webpack pipelines
- **Static assets:** Images/SVGs/icons via webpack loaders
- **Styling:** CSS loaders, MiniCssExtract, css-minimizer, Terser

---

## Game Engine

- **Simulation runtime:** Node.js service (`engine.js`)
- **Responsibilities:**
  - Simulate games (one per team per real-world day; time slots are scheduled)
  - Update player stats & progression
  - Manage team finances, contracts, promotion/relegation
  - Write results/state to MySQL for the web app to render

---

## Contracts & Blockchain

- **Universe (ERC-721):** Team ownership NFTs
- **Diamonds (ERC-20):** In-game currency for payroll, signings, etc.
- **Tooling:** Hardhat, OpenZeppelin
- **Indexing:** Custom services listen for on-chain events; primary game state lives off-chain in MySQL for performance

---

## Testing & Tooling

- **Contracts:** Hardhat tests (ethers + chai matchers)
- **Services:** Mocha test suite (+ ts-mockito for mocking)
- **Builds:** Multiple webpack targets (engine, web, dev)
- **TypeScript:** Strict mode enabled

---

## Quick Start

1) **Clone & install**

    git clone https://github.com/American-Space-Software/ethbaseball
    cd ethbaseball
    npm install

2) **Create environment file (combined config)**

   Use the **single-file** start scripts (web + engine together):

   - `npm run start`         → reads `.env.start.production`
   - `npm run start:dev`     → reads `.env.start.development`
   - `npm run start:sepolia` → reads `.env.start.sepolia`

3) **Build (required)**

    npm run build

4) **Run (development)**

    npm run start:dev

5) **Run (sepolia)**

    npm run start:sepolia

6) **Run (production-like)**

    npm run start

---

## Advanced Use Case: Split Services (Web + Engine)

For hosting/scaling in production you can run **web** and **engine** separately.  
This keeps the **minter private key off the web server** entirely (nice for security & ops).

- **Web server**
  - `npm run web`       → `.env.web.production`
  - `npm run web:dev`   → `.env.web.development`
  - `npm run web:sepolia` → `.env.web.sepolia`

- **Engine (simulation)**
  - `npm run engine`       → `.env.engine.production`
  - `npm run engine:dev`   → `.env.engine.development`
  - `npm run engine:sepolia` → `.env.engine.sepolia`

---

## Development Environment Example

> **Notes**
> - If `UNIVERSE_ADDRESS` is **not set**, the engine will **deploy a new Universe contract** to the configured network on first run. After it deploys, **copy the Universe address from the logs** and paste it into this file.
> - If `MINTER_WALLET_KEY` is not provided:
>   - The engine will generate a new wallet and print it to the console, **or**
>   - In `:dev` mode it defaults to the standard Hardhat test wallet `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.
> - `ALCHEMY_API_KEY` is **only needed in sepolia/production**. Leave it blank in development.

### `.env.start.development` (combined web + engine)
```
    ENV_NAME=development

    DISCORD=

    WEB=http://localhost:8080
    SIM_DATE="2025-08-01 10:00:00"
    SECONDS_BETWEEN_SIMS=60

    MYSQL_TIMEOUT=30000
    # MYSQL_HOST=mysqldb
    MYSQL_HOST=127.0.0.1
    MYSQL_DATABASE_NAME=ebldev
    MYSQL_ALLOW_EMPTY_PASSWORD=true
    # MYSQL_ROOT_PASSWORD=

    # Only set ALCHEMY_API_KEY in sepolia/production; leave blank in dev.
    ALCHEMY_API_KEY=

    # If blank, engine will deploy a new Universe and print the address in logs.
    UNIVERSE_ADDRESS=

    DEFAULT_AIRDROP=true

    OPENAI_API_KEY=
    ETHERSCAN_API_KEY=
    COINMARKETCAP_API_KEY=

    # --- Web auth (Discord OAuth) ---
    SESSION_SECRET=
    DISCORD_OAUTH_CLIENT_ID=
    DISCORD_OAUTH_CLIENT_SECRET=

    # --- Minter ---
    # If blank, engine generates; in :dev defaults to Hardhat test wallet.
    MINTER_WALLET_KEY=

    # --- Optional Ethereum provider config (leave blank in dev unless you need custom RPC) ---
    PROVIDER_LINK=
    PROVIDER_CHAIN_ID=
    PROVIDER_CHAIN_NAME=
    PROVIDER_CHAIN_RPC_URL=
    PROVIDER_CHAIN_BLOCK_EXPLORER=

    # --- If collection is on opensea specify the URL
    OPENSEA_COLLECTION_URL=
```
---

## Notes

- The web server and engine are separate processes; both must be running to see live simulation output in the UI.
- Assets (teams/diamonds) are on-chain; the simulation and state transitions run off-chain for performance.
- Keep production secrets out of version control. Use distinct `.env.*` files per environment as shown above.

---

## Quick Start: What Is EBL?

**Ethereum Baseball League (EBL)** is a baseball team-management sim. You set lineups and strategy; the sim plays one game per team per real-world day (1PM / 4PM / 7PM ET). Seasons last 162 days with a 30-day offseason.

- **Hands-Off Gameplay:** You manage the team; the sim runs games with daily box scores and play-by-play.
- **Global Ladder:** 10 leagues, 280 total teams, promotion/relegation each season.
- **Ownership:** Teams are ERC-721 NFTs; **🔷 Diamonds** (ERC-20) fund contracts and operations.
- **Open Source:** MIT-licensed — you can fork and run your own universe.

---

### Mainnet Launch & Airdrop

To celebrate EBL’s mainnet launch, we’re airdropping **40+ billion Diamonds** to **7,061 wallets** from historic Ethereum baseball NFT communities — enough to claim *every* team in the league using only rewards from the drop.

**Distribution:** 70% to MLB Champions holders, 30% to holders of other baseball NFT projects (Big Leagz, Moonshot Baseball, Meta Athletes, Diamond Dogs, Metafans, Baseball Head, Project Sandlot, Sandlot Slots).

The airdrop logic is open source. View the full list of recipients and rewards [here](LINK_TO_AIRDROP_PAGE).

---

### Claiming Diamonds & Minting a Team

1. Visit [playebl.com](https://playebl.com) and connect your wallet.
2. Open your dashboard and click **Mint XXX Diamonds** to lock in your reward.
3. Redeem on-chain to receive Diamonds (mint pass valid for 1 year).
4. On the Teams page, click **Start Mint Process** → choose **Mint with Diamonds** (or ETH) → confirm transaction.
5. The team NFT is transferred directly to your wallet. You can mint as many as you can afford in Diamonds or ETH.

---

### How to Start

1. **Get a Team:** Claim via airdrop or buy a team NFT.
2. **Login:** Connect wallet (sign message) or link Discord.
3. **Set Daily Stuff:** Choose lineup + rotation. The sim handles the rest.
4. **Fund Operations:** Deposit 🔷 if needed for payroll or signings.

*You don’t need to be online at game time — results post automatically after each game.*

**Pro Tip:** If you log in with Discord and link your wallet once, you can make all non-transactional moves (like setting lineups) just by logging in with Discord — no wallet needed on that device. For example: use your desktop wallet for important transactions, but log into your phone with Discord for day-to-day team management.

---

### Daily Responsibilities

- Set lineup: batting order, fielding positions.
- Manage rotation: rest pitchers, plan matchups.
- Adjust for fatigue, performance, and strategy.

**Tip:** Small, regular adjustments beat neglect. Missing starters? The sim auto-fills with minimum-salary rookies.

---

### Diamonds in Brief

**🔷 Diamonds** are ERC-20. **Your team** earns them through wins, attendance, and media deals, and spends them on player salaries, free agents, waivers, and upgrades.

- **Deposits:** Burn 🔷 on-chain to credit your team’s off-chain balance (~15 min).
- **Withdrawals:** Burn off-chain balance to mint 🔷 back to your wallet (~15 min).
- Negative team balances soft-lock roster moves until you’re positive again.

---

### Goals

- **Fun, strategic baseball sim:** Authentic pressure, meaningful decisions.
- **Free to join, open to fork:** Open source; rules enforced by contracts.
- **Focus on management:** Scouting, roster planning, player development, budget.
- **True ownership, real consequences:** Lose the wallet, lose the team.
- **Scarcity matters:** Limited stars and Diamonds make every choice count.
- **Build a baseball universe:** Compete, analyze, scout, or just watch.

---

### One Last Thing

EBL is a **hobby game**, not an investment. Treat spend like entertainment — you’re here to compete and have fun.

---

## Player Manual

---

### The Sim Engine

One game per team per day; time slots (1PM, 4PM, 7PM ET) are assigned and locked ahead. Results (box scores, stats, pitch-by-pitch) post immediately after games. The sim uses ratings, matchups, stamina, and in-game context to resolve every pitch.

You control strategy, lineups, rotations, and roster moves. The engine runs off-chain for speed; assets are on-chain for security.

---

### Leagues & Ladder

10 leagues × 28 teams. Top 3 promote; bottom 3 risk relegation. City caps limit duplicate top-tier teams from the same city. Negative revenue or balance triggers roster-lock until positive again.

**Foreclosure risk:** bottom 3 in the Tenth League must confirm activity or be re-auctioned.

---

### Ownership & NFTs

Teams are ERC-721 NFTs tied to a wallet. Lose the wallet, lose the team. Use hardware wallets and secure keys. Transfers move control instantly. After a 🔷 withdrawal, team transfers are locked for ~1 hour to prevent sellers from draining Diamonds right before a sale.

---

### How to Buy or Sell a Team

Teams are ERC-721 NFTs. Buy them on secondary markets or directly from other managers.

- Ownership transfers instantly once the blockchain transaction confirms.
- **Buyer Protection:** After a 🔷 withdrawal, team transfers are locked for ~1 hour. This prevents sellers from withdrawing Diamonds right before a sale so buyers receive the advertised balance.
- Use hardware wallets or secure key management — loss of a wallet means loss of the team.

---

### Contracts

**Rookies (Years 1–7)**

- Years 1–3: League minimum (varies by league; adjusts if traded/promoted).
- Years 4–7: Arbitration based on rating vs league averages.
- Promotion doubles rookie minimum (e.g., L2 → Apex).

**Veterans**

- After Year 7: 30-day free-agency countdown; asking price drops daily to final arb number.
- Contracts are fully guaranteed; all remaining owed on drop.

---

### Dropping Players & Prospects

- Drop rookie: pay remainder of this season.
- Drop veteran: pay all remaining seasons.
- Dropping generates a new 17–21 prospect (rookie deal) to fill the spot.

---

### Ratings, Stats & Progression

Players start 40–60 overall at age 17–21. Growth is performance-based; peak near age 27 (cap 100). After that, ratings decline gradually with age. Stats update after every game and influence contracts and value.

---

### Free Agents & Prospects

Free agents appear after rookie contracts. Salary asks drop daily during a 30-day countdown. Prospects are generated for dropped players, feeding lower leagues with talent for higher tiers to acquire.

---

### Team Finances

Balance = spendable 🔷. Revenue and expenses project daily. Profit/loss affects roster-lock status. See Reference for lease costs and revenue breakdown.

---

## Full Rules & Reference

### Leagues & Ladder Table

- Apex League
- The Second League
- The Third League
- The Fourth League
- The Fifth League
- The Sixth League
- The Seventh League
- The Eighth League
- The Ninth League
- The Tenth League

---

### Stadium Lease Costs

| League             | Lease Cost (🔷) |
|--------------------|-----------------|
| Apex League        | 1,500,000 🔷    |
| The Second League  | 750,000 🔷      |
| The Third League   | 375,000 🔷      |
| The Fourth League  | 187,500 🔷      |
| The Fifth League   | 93,750 🔷       |
| The Sixth League   | 46,875 🔷       |
| The Seventh League | 23,438 🔷       |
| The Eighth League  | 11,719 🔷       |
| The Ninth League   | 5,859 🔷        |
| The Tenth League   | 2,930 🔷        |

Lease is auto-deducted each game day.

---

### National Media Deal

| League             | Revenue (🔷)   |
|--------------------|----------------|
| Apex League        | 24,300,000 🔷  |
| The Second League  | 12,150,000 🔷  |
| The Third League   | 6,075,000 🔷   |
| The Fourth League  | 3,037,500 🔷   |
| The Fifth League   | 1,518,750 🔷   |
| The Sixth League   | 759,375 🔷     |
| The Seventh League | 379,688 🔷     |
| The Eighth League  | 189,844 🔷     |
| The Ninth League   | 94,922 🔷      |
| The Tenth League   | 47,461 🔷      |

**Other Revenue Sources:**

- **Local Media Deals** are based on your city’s population plus your long-term and short-term ratings.
- **Season Ticket Revenue** is determined at the start of each season based on those same factors, and then guaranteed each game.
- **Gate Revenue** is driven more by short-term ratings and game-to-game excitement.

---

### Diamonds (ERC-20)

Deposits burn on-chain and credit your team’s off-chain balance (~15 min). Withdrawals burn off-chain and mint on-chain (~15 min). Negative balances cause roster-lock until positive again.

---

### Deposits & Withdrawals

- **Deposits:** Click “Deposit” → burn 🔷 → server credits off-chain (~15 min).
- **Withdrawals:** Burn off-chain → mint 🔷 to wallet (~15 min). Only to owner wallet.
- After a 🔷 withdrawal, team transfers are paused for ~1 hour (buyer protection window).

---

### Game Simulation: Off-Chain Logic, On-Chain Assets

Gameplay is computed off-chain for speed and cost; ownership (teams/NFTs) and Diamonds live on-chain for transparency and security.

---

### Contracts Reference

All contracts are guaranteed.  
- **Rookies:** league min (years 1–3) then arbitration (years 4–7)  
- **Veterans:** free agency with 30-day decreasing ask.  

See Player Manual for details.

---

### Authentication

Wallet login: sign message, sets secure cookie. Discord login: optional; link/unlink wallets. Non-transactional actions can be done via Discord login on any device; on-chain actions still require wallet.

---

### Universe Contract (ERC-721)

280 fixed team NFTs; transfers move control; foreclosures can re-mint to new owners via minter key.

---

### Diamond Contract (ERC-20)

Used for all deposits/withdrawals; links on-chain value to off-chain play.

---

### Forking & Decentralization

Anyone with a modern computer can host a universe. Growth limits keep databases manageable. Tools will allow downloading and running a full copy of any EBL universe locally.

---

### License & Legal

MIT-licensed. No legal rights are tied to NFTs or tokens. You may manage multiple teams/wallets. Assume others may coordinate; play accordingly.

---

### Foreclosure

Bottom 3 teams in Tenth League must confirm activity or be foreclosed. Foreclosed teams are re-auctioned to new owners.

---

### Moderation & Bans

Discord and website access are centralized. Harassment, spam, or attacks on infrastructure may result in bans or lineup-tool blocks.

---

### Franchise Management (Future)

- Agent roles for contract negotiations.
- Franchise staff, scouting, and training systems.
- Stadium upgrades, cosmetic customization, media roles.
- Inter-league competitions and richer trading economy.

---

### FAQ

**Can the operator mint Diamonds at any time?**  
Yes. The operator can mint Diamonds at any time.

**Can the operator repossess teams?**  
Yes. The foreclosure mechanism allows for teams to be repossessed in theory at any time, though it is primarily used for inactive teams in the bottom league.

**What happens if I lose my wallet?**  
You lose the team. Teams are ERC-721 NFTs tied to a wallet; without the keys, there is no recovery.

**Can I own multiple teams?**  
Yes. There’s no limit to the number of teams you can own or manage.

**How many games are played per day?**  
One game per team per day, scheduled in one of three time slots: 1PM, 4PM, or 7PM ET.

**How long is a season?**  
162 real-world days, followed by a 30-day offseason.

**How does promotion and relegation work?**  
Top 3 teams in each league are promoted to the next tier up; bottom 3 are relegated down (with foreclosure checks in the lowest league).

**What are Diamonds used for?**  
Your team uses Diamonds for player salaries, free agents, waivers, and upgrades.

**How do teams earn Diamonds?**  
Teams earn Diamonds from wins, attendance, media deals, and other revenue sources like season tickets and gate sales.

**What happens if my team’s Diamond balance is negative?**  
Roster moves are locked until the balance is brought back to zero or positive.

**How do I deposit Diamonds?**  
Burn Diamonds on-chain via the “Deposit” function; your off-chain team balance updates in ~15 minutes.

**How do I withdraw Diamonds?**  
Burn Diamonds from your off-chain balance; they are minted back on-chain to your wallet in ~15 minutes. After a withdrawal, your team transfer is locked for ~1 hour to protect buyers.

**Do I have to be online when my games happen?**  
No. Games are simulated automatically; you can check results after they finish.

**What happens if I don’t set a lineup?**  
The sim will auto-fill with minimum-salary rookies to keep games playable.

**How do I drop a player?**  
Pay the remaining contract obligation (season for rookies, all years for veterans). A new 17–21-year-old prospect is generated to fill the spot.

**How does free agency work?**  
After a rookie’s 7-year contract ends, they enter a 30-day free agency where their asking price drops daily until it reaches their final arbitration value.

**What are the long-term and short-term ratings?**  
Long-term rating reflects your franchise’s sustained performance; short-term rating reflects your recent success and is used for dynamic factors like gate revenue.

**How are local media deals and season tickets calculated?**  
Local media revenue and season ticket sales depend on your city’s population plus both long-term and short-term ratings. Season tickets are set at the start of the season and guaranteed each game.

**How is gate revenue calculated?**  
Gate revenue is more sensitive to your short-term rating and game-to-game excitement.

**How do I link Discord to my wallet?**  
Log in with Discord, then link your wallet in the settings. Once linked, you can make all non-transactional moves using only your Discord login.

**Can I play entirely without a wallet?**  
No. You need a wallet for ownership and any on-chain transactions, but daily management can be done via Discord once linked.

**Is the sim engine on-chain?**  
No. Game simulation happens off-chain for performance reasons; only assets like teams and Diamonds are on-chain.

**Can I fork the game and run my own league?**  
Yes. The entire EBL codebase is open source (MIT license), and the airdrop/contract systems can be reused for custom universes.

**Are you affiliated with MLB Champions or other baseball NFT projects?**  
No. We simply recognize historic communities by reading public on-chain data for distribution purposes.

**Can the game change after launch?**  
Yes. The operator can push updates, change sim logic, or modify contracts, but all source code is public so you can review or fork at any time.
