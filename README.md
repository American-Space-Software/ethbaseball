# Ethereum Baseball League (EBL)

## Technical Overview

Ethereum Baseball League (EBL) is a competitive PvP sports ownership and business simulator.  
Players and in-game currency (Diamonds) are represented as Ethereum assets, while all simulation and gameplay run off-chain for performance.

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
  - Simulate games.
  - Update player stats & progression.
  - Manage team finances and rewards.
  - Write results/state to MySQL for the web app to render.

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
  - `npm run web`         → `.env.web.production`
  - `npm run web:dev`     → `.env.web.development`
  - `npm run web:sepolia` → `.env.web.sepolia`

- **Engine (simulation)**
  - `npm run engine`         → `.env.engine.production`
  - `npm run engine:dev`     → `.env.engine.development`
  - `npm run engine:sepolia` → `.env.engine.sepolia`

---

## Development Environment Example

> **Notes**
> - If `DIAMONDS_ADDRESS` is **set** the engine will update the database to match. If not configured here or in the database the engine will **deploy a new Diamonds contract** to the configured network on first run. 
> - If `MINTER_WALLET_KEY` is not provided:
>   - The engine will generate a new wallet and print it to the console, **or**
>   - In `:dev` mode it defaults to the standard Hardhat test wallet `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.
> - `ALCHEMY_API_KEY` is **only needed in sepolia/production**. Leave it blank in development.

### `.env.start.development` (combined web + engine)

```env
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

# If blank, engine will deploy a new Diamonds contract and print the address in logs.
DIAMONDS_ADDRESS=

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



## Notes

- The web server and engine are separate processes; both must be running to see live simulation output in the UI.
- Assets (teams/diamonds) can be on-chain; the simulation and state transitions run off-chain for performance.
- Keep production secrets out of version control. Use distinct `.env.*` files per environment as shown above.

---

## What Is EBL?

**Ethereum Baseball League (EBL)** is a baseball team-management sim. You run a franchise by managing rosters, lineups, and pitching rotations with the goal of winning games and building a strong baseball business.

- **Team Management:** Set lineups and rotations, then play games on demand. Box scores and pitch-by-pitch post right after each game.
- **Anyone Can Play:** Sign in with Discord and you are instantly given a team with generated players.
- **Diamonds 🔷:** Earned in-game from play and performance. Withdrawal to Ethereum is optional.
- **Open Source:** MIT licensed. Fork and run your own universe.
- **Season Length:** Seasons last 162 days.

---

## Get Started

1. **Login:** Sign in with Discord.
2. **Get Your Team:** On your first login, you are given a team with generated players.
3. **Set Lineup and Rotation:** Choose batting order, fielding positions, and plan pitcher usage.
4. **Play Games:** Join the PvP queue or play a bot whenever you want. Pitcher stamina affects who is available.
5. **Optional Wallet:** Link a wallet only if you want to withdraw Diamonds to Ethereum or deposit from Ethereum.

*You do not need a wallet to play. Results post immediately after each game.*

**Pro Tip:** Discord login works great on mobile for day-to-day management. If you link a wallet, you only need it for on-chain actions.

---

## Wallet Linking (Optional)

1. Open your profile and choose **Link Wallet**.
2. Sign a message to confirm the wallet address.
3. Once linked, you can withdraw Diamonds to Ethereum or deposit Diamonds from Ethereum.

*Wallet linking is optional. You can play fully with Discord only.*

---

## Regular Responsibilities

- Set lineup: batting order and fielding positions.
- Manage rotation: rest pitchers and plan matchups.
- Adjust for fatigue, performance, and team strategy.

**Tip:** Small, regular adjustments beat neglect. Missing starters? The sim auto-fills with minimum-salary rookies.

---

## Daily and Season Diamond Rewards

Each night, a **1,000 🔷 daily reward pool** is split across all teams that played at least one completed game that day.

Your share of the pool is based on a blended rating that uses both your:

- **Season rating** (resets to 1500 each season)
- **Long-term rating** (never resets)

On the final day of the season, we also distribute a **20,000 🔷 season bonus pool** that is split across every team that played at least one completed game at any point during the season, using the same blended rating formula.

> **Note:** 1,000 🔷 is the total pool for everyone that day — not a per-team payout.

---

## Diamonds in Brief

**Diamonds 🔷** are EBL’s in-game currency. Teams earn them through play and reward pools. Your team balance lives off-chain by default.

- **Withdrawals (Optional):** If you link a wallet, you can withdraw Diamonds to Ethereum. Diamonds are created on-chain at the moment you withdraw.
- **Deposits (Optional):** If you have on-chain Diamonds, you can deposit them back to your team balance.
- Negative team balances soft-lock roster moves until the balance is positive again.

---

## Player Ownership and Trading

Players can be listed for sale and traded. Some trading features may use Ethereum-based assets for transfer and marketplace support. Details will expand over time as the market tools mature.

---

## Goals

- **Fun, strategic baseball sim:** Feel like you run a real franchise with real choices.
- **Forkable:** MIT licensed so anyone can create a custom EBL universe.
- **Focus on management:** Scouting, roster building, player development, and payroll.
- **Scarcity matters:** Limited stars and limited Diamonds make choices matter.
- **Regular engagement, not grind:** 5 to 10 minutes a day is enough to stay competitive.
- **Community growth:** Trading, rivalries, and collaboration between managers.
- **Transparency:** Core code and reward logic are open source and documented.
- **Expandable:** Room for staff roles, stadium upgrades, and more.
- **Ethereum integration:** Optional withdrawals and deposits for Diamonds, with more market features over time.

**EBL is a hobby game, not an investment.** Treat spending like entertainment. You are here to compete and have fun.

---

## Player Manual

### The Sim Engine

You can play at any time by joining PvP matchmaking or playing a bot. Pitcher stamina limits how often you can run your best arms, so rotation planning and roster depth matter.

Results like box scores, stats, and pitch-by-pitch post right after games. The sim uses ratings, matchups, stamina, and game context to resolve every pitch.

---

### Strategy and Control

You control strategy, lineups, rotations, and roster moves. The engine runs off-chain for speed. Diamonds can be withdrawn to Ethereum if you choose.

---

### Ratings and Rewards

Each team has a **season rating** and a **long-term rating**.

- When you start playing and at the start of each season, both begin at **1500**.
- Your **season rating resets** each season.
- Your **long-term rating never resets**.

Rewards use a blended rating so long-term strength still matters, but the advantage is naturally smaller at the start of each season.

---

### Reward Pools

Two reward pools exist:

- **Nightly pool:** teams that played at least one completed game that day
- **Season bonus pool:** on the final day of the season, teams that played at least once during the season

---

### Accounts and Wallets

Your team is tied to your Discord account for day-to-day play. Linking a wallet is optional and only required for on-chain deposits and withdrawals of Diamonds.

---

### Dropping Players and Prospects

Dropping a player creates a new 17 to 21 year old prospect on a rookie deal to fill the open roster spot.

---

### Ratings, Stats, and Progression

Players start between **10 and 20 overall** at ages **17 to 21**. Growth is based on performance. Most players peak near age 27 with a maximum rating of 100. After that, ratings decline with age. Stats update after every game and affect value and contracts.

---

## Full Rules & Reference

### Diamonds (ERC-20)

Diamonds are tracked off-chain by default. When you withdraw, Diamonds are created on-chain and sent to your wallet. If a wallet is linked, on-chain Diamonds can be deposited back into your team balance. Negative balances cause a roster lock until the balance is positive again.

---

### Deposits & Withdrawals

- **Deposits:** Click “Deposit” → transfer 🔷 from a linked wallet into your team balance (~15 min).
- **Withdrawals:** transfer 🔷 from your team balance to your linked wallet (~15 min).
- Only a linked wallet can deposit or withdraw.

---

### Game Simulation: Off-Chain Logic, On-Chain Tokens

Gameplay is computed off-chain for speed and cost control. Diamonds remain off-chain unless withdrawn to Ethereum.

---

### Authentication

Discord login is the default authentication method. Wallet linking is optional and only required for on-chain Diamond deposits and withdrawals.

---

### License & Legal

EBL is MIT licensed. No legal rights are tied to playing the game. Diamonds function as in-game currency.

---

### Moderation and Bans

Website and Discord access are centralized. Harassment, spam, or infrastructure abuse can result in bans or lineup tool restrictions.

---

### Franchise Management (Future)

Planned systems include agent roles for contract negotiation, staff and scouting systems, stadium upgrades, cosmetic customization, and expanded player trading tools.

---

## FAQ

**What is Ethereum Baseball League and how does it work?**  
EBL is a baseball management sim. You sign in with Discord, get a team with generated players, set lineups and rotations, and play games on demand by joining the PvP queue or playing a bot. Results post right after each game. You adjust strategy and roster between games.

**Do I need a wallet to play?**  
No. You can play fully with Discord only. A wallet is only needed if you want to withdraw Diamonds to Ethereum or deposit them from Ethereum.

**How do I get a team?**  
When you log in with Discord for the first time, you are automatically given a team with generated players.

**How long is a season?**  
162 days of games.

**Do I have to be online during games?**  
No. You can play at any time. Results post immediately after each game.

**How are games simulated?**  
An off-chain engine processes every pitch using ratings, matchups, stamina, and game context. Results, stats, and standings update right after each game.

**How much time does it take to manage a team?**  
About 5 to 10 minutes a day is enough for competitive play. More time helps with scouting, roster moves, and deeper strategy.

**Can I own multiple teams?**  
Yes. Each Discord account manages one team. You can also run multiple teams if you choose, especially when testing or managing teams across different strategies.

**How do daily Diamond rewards work?**  
Each night, a **1,000 🔷 daily reward pool** is split across all teams that played at least one completed game that day. Your share is based on a blended rating that uses both season rating and long-term rating. Season rating resets to 1500 each season and long-term rating never resets.

**Is there a season-end reward?**  
On the final day of the season, a **20,000 🔷 season bonus pool** is split across all teams that played at least one completed game during the season, using the same blended rating formula.

**Are Diamonds on Ethereum?**  
Diamonds are created on-chain when you withdraw to Ethereum. If you never withdraw, your balance stays off-chain.

**What can Diamonds be spent on?**  
Free agents, waiver claims, and other future upgrades.

**How long do deposits and withdrawals take?**  
Usually about 15 minutes.

**What happens when I drop a player?**  
They are available to be signed by any other team, and a new 17 to 21 year old prospect is generated to fill the open roster spot.

**How do free agents work?**  
Asking prices drop daily.

**Can I manage my team from my phone?**  
Yes. Discord login works on mobile. On-chain actions still need your wallet.

**Is the sim run on-chain?**  
No. The sim runs off-chain. Diamonds can be withdrawn to Ethereum if you want.

**Is this an investment?**  
No. EBL is a hobby game. Spend only what you are comfortable treating as entertainment.

**Can I fork the code and run my own league?**  
Yes. EBL is MIT licensed. You can fork it and run your own version with your own rules.

**Are there moderators?**  
Yes. Harassment, spam, or attacks on infrastructure can result in bans or limits on lineup tools.
