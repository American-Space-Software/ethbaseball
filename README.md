# Ethereum Baseball League (EBL)

## Technical Overview

Ethereum Baseball League (EBL) is an online baseball game where you run a franchise, compete against other teams, watch games live, and play through a 162-day season on top of an open baseball simulation engine.

The simulation and game state run off-chain for performance. Diamonds can move onto Ethereum through open smart contracts, which allows them to exist outside the main game instead of remaining locked to a single app.

This document provides a technical overview of the stack, quick-start steps, environment file examples, and a summary of the core game systems.

---

## Why This Project Exists

EBL started from a simple frustration: baseball games and franchise saves reset too often, and too much player history depends on a single company or a single release cycle.

This project takes a different approach.

The simulation engine is open source so it can be studied, preserved, modified, and extended over time. The web app is built for shared league play instead of only single-player franchise mode. Ethereum is used as open infrastructure for optional Diamond withdrawals and deposits, so value is not forced to remain inside one server.

EBL is the first public baseball game built on top of that philosophy.


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

- Diamonds (ERC-20): Optional on-chain representation of Diamonds earned in-game
- Tooling: Hardhat, OpenZeppelin
- Design: Gameplay and simulation remain off-chain for speed; Ethereum is used where open infrastructure is useful
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

Ethereum Baseball League (EBL) is an online baseball management game built around shared league play.

You run a franchise by managing:

- Rosters
- Lineups
- Pitching rotations
- Player transactions
- Long-term strategy

Games are simulated pitch-by-pitch using player ratings, stamina, matchups, and game situation.

You can watch games live with a field view and pitch-by-pitch updates while your team competes against other teams across the same season.

The game combines the strategy of a baseball simulator with the accessibility of a browser-based app and the continuity of an open simulation engine.

Diamonds are earned through regular-season game-day revenue and season-end rewards.

---

## Technical Design Philosophy

EBL splits the system into two layers:

1. **Off-chain simulation and game state** for speed, flexible design, and a responsive web app
2. **Optional on-chain settlement** for Diamonds when players want balances to move onto Ethereum

This split is intentional. Baseball simulation involves constant state changes and frequent updates that are better handled off-chain. Ethereum is used where open infrastructure is most useful: optional transfers, open smart contracts, and the possibility of compatible community-run systems.

--- 

## Season Structure

Seasons run on a real-world calendar.

- Seasons last **162 days**
- Each day represents **one game on the schedule**
- The season day advances daily at **9:30 AM ET**

If your team falls behind the schedule, you can queue additional games to catch up to the current season day.

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


## Player Progression & Ratings

### Rating System Philosophy

The player rating system in EBL is designed to feel intuitive while still supporting a deep underlying simulation model.

#### League Average

- **100 overall is considered league average**
- Players above 100 are above-average contributors
- Players below 100 are below-average or developing

This gives ratings a clear, interpretable meaning:

- ~80 → replacement-level / early development  
- ~100 → solid everyday player  
- ~120+ → high-level player  
- ~140+ → elite  
- ~160+ → rare, top-tier talent  

---

### Potential vs Current Rating

Each player has a **potential rating** that represents their long-term ceiling.

At generation:

- Players enter the league with **low potential (e.g. ~70)**
- Their **actual rating is derived** using age-based modifiers and experience

This means:

- A young player may have a lower current rating than their potential  
- Ratings increase over time as the player gains experience  

---

### Experience-Based Progression

Player progression is driven by **experience (XP)** earned through gameplay.

- XP accumulates over time  
- Ratings are calculated from XP using an exponential curve  
- Ratings are **derived values**, not directly incremented  

#### Rating Range

- Minimum: **70 overall**  
- Maximum: **170 overall**  

This creates a **100-level progression system**:

---


### Development Curve

The system is designed so that:

- A typical player starting around **70 potential**  
- Will reach approximately **league average (~100 overall)**  
- In about **3 seasons of regular play**  

This ensures:

- Early progression feels fast and rewarding  
- Players become viable contributors within a reasonable timeframe  
- Long-term growth still requires sustained performance  

---

### Age-Based Development

Player development is influenced by age:

- Younger players gain experience more efficiently  
- Growth slows as players approach their late 20s and beyond  

The rating shown in the UI always reflects:

- Total accumulated experience  
- Age-based learning modifiers  
- The progression curve  

---
### Letter Grades (User-Facing Ratings)

While the simulation operates on numeric ratings, EBL primarily presents player ability using **letter grades**.

This keeps the game readable and intuitive without requiring players to understand the full underlying model.

#### Why Letter Grades?

- Prevents over-optimization based on exact numbers  
- Keeps player evaluation closer to real-world scouting  
- Maintains competitive fairness in an open-source system  
- Improves readability across large rosters and stat tables  

Players are evaluated using grades like:

A+, A, A-  
B+, B, B-  
C+, C, C-  
D+, D  
F  

---

#### Mapping Ratings to Grades

Each letter grade corresponds to a range of underlying ratings.

Example ranges:

| Grade | Rating Range |
|------|-------------|
| A+   | 160+        |
| A    | 150–159     |
| A-   | 140–149     |
| B+   | 130–139     |
| B    | 120–129     |
| B-   | 110–119     |
| C+   | 100–109     |
| C    | 90–99       |
| C-   | 80–89       |
| D+   | 75–79       |
| D    | 70–74       |
| F    | <70         |

> Note: Exact ranges may be tuned over time as the game evolves.

---

#### Design Philosophy

Letter grades are intended to:

- Provide **clear, quick evaluation** of players  
- Encourage **relative comparison**, not exact optimization  
- Align with familiar sports concepts (scouting grades, tiers, etc.)

Advanced players can still explore the full model through the open-source code, but gameplay is designed to be fully understandable using grades alone.


---

### Development Budget

Teams can allocate a percentage of their earnings toward player development.

#### Tradeoff

- **Higher budget**
  - Faster player growth (more XP)  
  - Less diamond profit  

- **Lower budget**
  - Slower development  
  - More diamonds saved for roster moves  

#### XP Bonus Formula


Examples:

| Budget | XP Bonus |
|--------|---------|
| 0%     | +0%     |
| 50%    | +25%    |
| 100%   | +50%    |

---

### Game Settlement

Rewards are applied **after each game completes**.

Each game produces:

1. **Reward transaction** (Diamonds earned)  
2. **Development expense** (budget allocation)  


---

### Transparency

EBL is fully open source and designed for technically curious players.

- The progression system is intentionally transparent  
- XP, ratings, and formulas can be inspected  

---

## Season-End Rewards

At the end of the regular season, an additional **20,000 🔷 season-end reward pool** is distributed.

Teams must have played at least one game during the season to be eligible.

Stronger teams generally finish higher in the standings, and stronger ratings generally earn a larger share of the season-end pool.
---

## Diamonds 🔷

Diamonds are used for things such as:

- signing players
- payroll
- roster actions
- future upgrades

Diamonds are tracked **off-chain by default**.

Regular-season Diamonds are introduced through game-day revenue. Additional Diamonds are introduced through the season-end reward pool.

Diamonds are created on Ethereum only when withdrawn.

Players can also deposit on-chain Diamonds back into their team balance.

Because Diamonds can move onto open infrastructure, they do not have to remain locked inside one server. In the long run, that creates room for compatible community-run universes and side games built on the same basic system.

A wallet is **not required to play**.

---

## Goals

- Strategic baseball management with meaningful long-term decisions
- Shared league play in a browser-based app
- Transparent, open simulation logic
- Optional Ethereum integration built on open infrastructure
- Forkable universes and community-run extensions
- Long-term continuity instead of yearly resets

---

## Maintainer

EBL is created and maintained by Patrick Toner.

If you have ideas, want to contribute, or want to build on the project, feel free to reach out:

- LinkedIn: https://www.linkedin.com/in/%E2%9A%BE%F0%9F%8F%B4%E2%80%8D%E2%98%A0%EF%B8%8F-patrick-toner-69343713/

## License

MIT License
