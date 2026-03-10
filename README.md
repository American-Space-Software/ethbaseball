# Ethereum Baseball League (EBL)

## Technical Overview

Ethereum Baseball League (EBL) is a competitive PvP baseball franchise and business simulator.
The in-game currency (Diamonds) is represented as an Ethereum asset, while all simulation and gameplay run off-chain for performance.

This document provides a technical overview of the stack, quick-start steps, and environment file examples.

---

## Core Technologies

- Runtime: Node.js (TypeScript, ESM modules)
- Frameworks: Express (API/web server), Framework7 (frontend mobile/web UI)
- Bundling: Webpack
- Database: MySQL 8
- ORM: Sequelize + sequelize-typescript
- Smart Contracts: Solidity (Hardhat + OpenZeppelin)
- Testing: Mocha, Hardhat

---

## Authentication

- Discord OAuth2 (via `passport-discord-auth`) with refresh support (`passport-oauth2-refresh`)

---

## Web & UI

- Templating: Eta (server-rendered views), HTML & CSS loaders via Webpack pipelines
- Static assets: Images/SVGs/icons via webpack loaders
- Styling: CSS loaders, MiniCssExtract, css-minimizer, Terser

---

## Contracts & Blockchain

- Diamonds (ERC-20): In-game currency for payroll, signings, etc.
- Tooling: Hardhat, OpenZeppelin
- Indexing: Custom services listen for on-chain events; primary game state lives off-chain in MySQL for performance

---

## Testing & Tooling

- Contracts: Hardhat tests
- Services: Mocha test suite
- Builds: Multiple webpack targets (engine, web, dev)

---

## Quick Start

1) **Clone & install**

```
git clone https://github.com/American-Space-Software/ethbaseball
cd ethbaseball
npm install
```

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

Ethereum Baseball League (EBL) is a baseball team-management simulation.

You run a franchise by managing:

- Rosters
- Lineups
- Pitching rotations
- Roster moves
- Long-term strategy

Games are simulated pitch by pitch using player ratings, stamina, matchups, and game situation.

You can watch games live with a field view and pitch-by-pitch updates.

Diamonds are earned through regular-season game-day revenue and season-end rewards.

---

## Season Structure

Seasons run on a real-world calendar.

- Seasons last **162 days**
- Each day represents **one game on the schedule**
- The season day advances daily at **9:30 AM ET**

If your team falls behind the schedule, you can join matchmaking again to play additional games until you catch up.

---

## Matchmaking

When joining matchmaking, you choose an opponent **rating range**.

A narrower range targets closer opponents and higher expected Diamonds. A wider range makes matches easier to find, but usually lowers the expected Diamond amount.

The system searches within that range and expands the search over time if needed.

---

## Game-Day Revenue (Diamonds 🔷)

Each match shows its **Diamond amount before the game begins**.

For regular-season games, Diamonds work like game-day revenue. The Diamond amount is based on the **actual rating difference between the two teams**, not on the final result.

- Very close matches receive the **full Diamond amount**
- Larger mismatches receive **reduced Diamond amounts**
- Extremely uneven matchups may receive **zero Diamonds**

The Diamond amount is the **same whether you win or lose**, but wins and losses still matter for standings, ratings, and season success.

Regular-season game-day revenue is identical across all leagues and teams.


### Reward Curve Example

| Rating Gap | Diamond % | Diamond Amount (Base = 100 🔷) |
| --- | ---: | ---: |
| 0–25 | 100% | 100 🔷 |
| 50 | 83% | 83 🔷 |
| 100 | 50% | 50 🔷 |
| 150 | 10% | 10 🔷 |
| 250+ | 0% | 0 🔷 |


---

## Season-End Rewards

At the end of the regular season, an additional **20,000 🔷 season-end reward pool** is distributed.

Teams must have played at least one game during the season to be eligible.

Stronger teams generally finish higher in the standings, and stronger ratings generally earn a larger share of the season-end pool.
---

## Diamonds 🔷

Diamonds are the in-game currency used for things such as:

- signing players
- payroll
- roster actions
- future upgrades

Diamonds are tracked **off-chain by default**.

Regular-season Diamonds are introduced through game-day revenue. Additional Diamonds are introduced through the season-end reward pool.

Diamonds are minted on Ethereum only when withdrawn.

Players can also deposit on-chain Diamonds back into their team balance.

A wallet is **not required to play**.

---

## Goals

- Strategic baseball management
- Transparent simulation engine
- Optional blockchain integration
- Open-source ecosystem
- Forkable universes
- Long-term competitive play

---

## License

MIT License
