# PRD — ZK Battleship on Starknet (working title)

> This document captures the full product spec for a **provably fair**, Bitcoin-friendly, on-chain Battleship built with **Dojo + Torii + three.js**, **Noir→Garaga** ZK proofs on **Starknet**, **Cartridge Controller** for passkey onboarding, sessions and gasless play, and **Xverse + Atomiq** for BTC-in/BTC-out.

---

## 1) Goals, Non-Goals, Success Criteria

### 1.1 Goals

- **Provable gameplay:** Enforce hidden info & rules by ZK, not trust. Prove **board validity at commit** and **per-turn result** without leaking extra info (Noir circuits; verify on Starknet via **Garaga**). ([StarkNet][1])
- **AAA-style UX:** **Passkey onboarding**, **session policies** (no prompts per move), and **gas sponsorship** via **Cartridge Controller**. ([docs.cartridge.gg][2])
- **Bitcoin rails:** **BTC/Lightning** deposits/withdrawals with **Xverse** (Sats Connect) and **Atomiq** trustless swaps to Starknet assets (Garden path). ([docs.xverse.app][3])
- **Live, reactive client:** **Torii** streams world state to a **three.js** UI for real-time feedback. ([book.dojoengine.org][4])
- **Rapid iteration:** Local dev with **Katana** sequencer; deploy with **Sozo**. ([dojoengine.org][5])

### 1.2 Non-Goals

- 3D AAA art/physics; we use lightweight **three.js** visuals.
- P2W advantages; **cosmetics only** (optional).
- Centralized custody; all value flows are **escrow-based & non-custodial**.

### 1.3 Success Criteria (Hackathon)

- < **60s** from landing → first shot (new user).
- > **90%** turns auto-approved via sessions (no signature popups).
- **Proof verify gas** ≤ target (documented), **avg turn latency** under target (visible metrics panel).
- **BTC-in → play → BTC-out** demo end-to-end.
- Clear sponsor alignment (Cartridge UX, Fat/Noir+Garaga ZK, Xverse+Atomiq BTC rails).

---

## 2) Users, Modes & Core Loop

### 2.1 Personas

- **Crypto-curious gamer:** wants seamless play, no seed phrases.
- **Bitcoin power user:** prefers BTC/Lightning, Starknet-transparent.
- **On-chain purist:** values verifiability & anti-cheat guarantees.

### 2.2 Modes

- **Casual (free/credits):** no staking; quick matches.
- **Wagered (escrow + bond):** each player stakes; **anti-grief bond** slashed on timeout; winner auto-settled; optional small rake → seasonal prize pool.

### 2.3 Core Loop

1. Connect (passkey) &/or link Xverse; join/create lobby; deposit if wagered.
2. **Commit board** with **ZK validity proof** (ships count, sizes, no overlap).
3. Turn: attacker selects (x, y) → defender submits **ZK result** (hit/miss) with **nullifier**; Dojo updates state; Torii streams to UI.
4. Sunk/win conditions; settle escrow; optional withdraw to BTC.

---

## 3) System Architecture

### 3.1 Components (at a glance)

- **Client:** three.js app; **Cartridge Controller** SDK (passkeys, policies, paymaster); **Xverse** (Sats Connect) for BTC/Lightning. ([docs.cartridge.gg][2])
- **On-chain game (Starknet):** **Dojo** ECS **World** (Models + Systems). **Garaga** verifier contracts called inside Systems. **Torii** indexes model changes for GraphQL/subscriptions. ([book.dojoengine.org][4])
- **Proving:** **Noir** circuits (browser/worker via NoirJS; modular backend). ([noir-lang.org][6])
- **Dev:** **Katana** local sequencer; **Sozo** build/migrate; **Torii** locally for GraphQL. ([dojoengine.org][5])
- **BTC rail:** **Atomiq** trustless swaps (SPV/HTLC & Garden path) with **Xverse** wallet flows. ([StarkNet][7])

### 3.2 Data Model — Dojo Models

(Types abbreviated; keys `#[key]`)

- **Game** `{ #[key] id, p1, p2, status, turn_player, board_size }`
- **BoardCommit** `{ #[key] game_id, #[key] player, commitment, rules_hash }`
- **Shot** `{ #[key] game_id, #[key] turn_no, shooter, x, y, result }`
- **NullifierSet** `{ #[key] game_id, #[key] nullifier }` — prevents replaying a cell proof
- **ShipStatus** `{ #[key] game_id, #[key] player, ship_kind, hits, sunk }`
- **Escrow** `{ #[key] game_id, token, stake_p1, stake_p2, bond_p1, bond_p2 }`

### 3.3 Systems (entrypoints)

- `create_game(p2, board_size)`
- `commit_board(commitment, rules_hash, proof_board_commit)` → **verifies via Garaga** then writes `BoardCommit`. ([StarkNet][1])
- `start_game()` (finalizes when both commits present; coin-flip via commit-reveal)
- `fire_shot(x, y)` → records pending shot & switches to defend phase
- `apply_shot_proof(x, y, result, nullifier, proof_shot)` → **Garaga verify**; write `Shot`; add `NullifierSet`; update `ShipStatus`; swap turn
- `claim_sunk(ship_kind, proof_sunk?)` (optional ZK)
- `timeout(player)` → slashes **bond** of the staller; may award match
- `stake_and_bond(token, stake, bond)`; `settle_escrow()` on match end

### 3.4 ZK Circuits (Noir) — I/O Contracts

- **BoardCommit**

  - **Private:** board layout; salt(s)
  - **Public:** `commitment`, `rules_hash`
  - **Proves:** correct ship counts/sizes; grid bounds; **no overlap** (and optional non-adjacency)

- **ShotResult**

  - **Private:** board & salts; `(x,y)`
  - **Public:** `commitment`, `x`, `y`, `result`, `nullifier = H(secret, x, y)`
  - **Proves:** hit/miss is consistent with the committed board; **nullifier uniqueness**

- **SunkCheck (optional)**

  - **Public:** `commitment`, `ship_kind`, `sunk_bool` (or batched with ShotResult)

**On-chain verification path:** Compile Noir → **Garaga** generates **Cairo verifier** → Dojo System calls verifier before state mutation. ([StarkNet][1])

### 3.5 Reads — Torii

- Torii indexes ECS state; expose **GraphQL queries + subscriptions** for `Game`, `Shot`, `ShipStatus`, etc., enabling reactive UI. ([book.dojoengine.org][4])

### 3.6 Dev Environment

- **Katana** local sequencer for fast blocks; configure block time & fees as needed for tests. ([dojoengine.org][5])

---

## 4) Payments & BTC Rails

### 4.1 Escrow & Bond (on Starknet)

- **Escrow stake**: both players lock stake in `Escrow`.
- **Anti-grief bond**: smaller deposit, **slashed** on timeout.
- **Settlement**: auto-payout winner; optional rake → seasonal pool.

### 4.2 BTC Deposit (Xverse + Atomiq) — User Flow

1. Connect **Xverse** (Sats Connect) to fetch BTC address / sign message binding to Starknet account. ([docs.xverse.app][8])
2. Request **Atomiq** quote (BTC→Starknet asset) → presents **BTC address/QR** or **Lightning invoice**. ([StarkNet][7])
3. User pays in **Xverse** (on-chain BTC via PSBT or Lightning). ([docs.xverse.app][3])
4. **Atomiq** verifies via SPV/HTLC and **mints/releases** to user’s Starknet address (Garden). Funds appear; play begins. ([StarkNet][7])

### 4.3 BTC Withdrawal (reverse swap)

1. Create reverse quote; burn/lock wrapped asset on Starknet.
2. **Atomiq** delivers **on-chain BTC** or pays **Lightning invoice** to Xverse. ([StarkNet][7])

> **Why Atomiq/Garden:** trustless swaps with **Bitcoin light-client & HTLC** design; **zero-slippage** UX; minimal trust assumptions. ([StarkNet][7])

---

## 5) UX & Controller Integration

### 5.1 Onboarding & Sessions

- **Passkeys/social** via **Cartridge Controller**; creates an embedded smart wallet.
- **Session policies** scoped to your System entrypoints (`commit_board`, `fire_shot`, `apply_shot_proof`, `timeout`, `settle_escrow`).
- **Verified Sessions** (preset) for one-tap connect; **Paymaster** sponsors tx for **gasless** turns. ([docs.cartridge.gg][2])

### 5.2 Live Client

- three.js scene subscribes to **Torii**; optimistic animations on action; reconcile on indexed updates. ([book.dojoengine.org][4])

### 5.3 Metrics Overlay (for judges)

- Prove time (ms), proof size (KB), verify gas, turn latency, % auto-approved, BTC settlement times.

---

## 6) Detailed Requirements

### 6.1 Functional

- Create/join lobby; optional filters (wager size, board size).
- **Stake & bond** with supported Starknet tokens; BTC path credits supported asset post-swap.
- **Board commit** with ZK proof; store `(commitment, rules_hash)`.
- **Turn system** with attacker/defender phases and **timeouts**.
- **Per-turn proof** verification (`ShotResult`); prevent **replay** via `NullifierSet`.
- **Settlement** on win; **forfeit** auto-resolves to opponent and slashes bond.
- **BTC deposit/withdraw** via Xverse + Atomiq (testnet).
- **Achievements** (stretch): event-based badges.

### 6.2 Non-Functional

- **Performance:** Turn latency target <3s (Lightning path), <10s (on-chain BTC deposit wait not counted).
- **Reliability:** Idempotent on-chain writes; retries on client → safe.
- **Security:** Least-privilege session policies; rate limits; nullifier uniqueness; circuit audits (internal).
- **Compliance:** Region toggle to disable wagering; free mode default.

---

## 7) API Contracts & Interfaces

### 7.1 Dojo Systems (Cairo entrypoints)

- `commit_board(commitment, rules_hash, proof_bytes[])` → calls **GaragaVerifier.verify**; writes `BoardCommit` on success. ([GitHub][9])
- `fire_shot(x,y)`
- `apply_shot_proof(x,y,result,nullifier, proof_bytes[])` → verify; write `Shot`; insert `NullifierSet(nullifier)`
- `timeout(player)`; `settle_escrow()`
- `stake_and_bond(token, stake, bond)`; `refund_bond()` (when applicable)

### 7.2 Torii GraphQL (examples)

- `query Game($id)` → `Game, BoardCommit[]`
- `subscription Shots($gameId)` → streams `Shot` rows in order
- `subscription Status($gameId)` → streams `ShipStatus`, `Game.status`
  (Torii auto-generates schema from models; use DOCS tab to inspect.) ([dojoengine.org][10])

### 7.3 Controller Session Policy (JSON sketch)

```json
{
  "contracts": {
    "0x<DojoSystem>": {
      "name": "Battleship",
      "description": "In-match actions",
      "methods": [
        "commit_board",
        "fire_shot",
        "apply_shot_proof",
        "claim_sunk",
        "timeout",
        "settle_escrow"
      ],
      "limits": { "maxCallsPerHour": 200, "maxValuePerTx": "0" }
    }
  }
}
```

(Submit for **Verified Sessions** preset for no-prompt connect.) ([docs.cartridge.gg][2])

### 7.4 Noir Circuits I/O (schema)

- `BoardCommit(board[100], salt) -> (commitment, rules_hash)`
- `ShotResult(board[100], salt, x, y, secret) -> (commitment, x, y, result, nullifier)`
- `SunkCheck(board[100], salt, ship_kind) -> (commitment, ship_kind, sunk_bool)`

### 7.5 Xverse (Sats Connect) snippets

- `wallet_connect()` returns addresses (BTC, Starknet, etc.); `signMessage()` binds identity; PSBT/Lightning payment flows as needed. ([docs.xverse.app][8])

### 7.6 Atomiq (swap lifecycle)

- `POST /quote` (amount, dest_chain=starknet, dest_addr) → `{invoice|btc_addr, rate, expiry}`
- Client polls `/status/:swapId` → `pending | confirmed | minted` to credit Starknet acct (Garden). (Abstracted from public docs/blog; exact endpoints may vary; integrate per Atomiq API.) ([StarkNet][7])

---

## 8) Game Logic & Economics

### 8.1 Rules

- Standard Battleship (configurable board & ship set).
- **Commit-then-prove** per turn; optional blind sunk proofs.

### 8.2 Anti-Grief Economics

- **Bond** must be posted before starting; on **timeout**, opposing player can slash.
- **Auto-settlement** after win or forfeit; unmatched stakes refunded.

### 8.3 Tournaments/Seasons (stretch)

- Custodyless prize pools funded by small rake; bracket logic off-chain, settlement on-chain.

---

## 9) Security, Privacy, Compliance

- **ZK first:** Illegal layouts blocked at commit; per-turn correctness proven; **nullifiers** stop replay.
- **Session safety:** Narrow methods, low value caps, short expiry; audit presets before Verified Session. ([docs.cartridge.gg][2])
- **Region toggles:** Wagering disabled where needed; casual mode default.
- **Integrity:** All verifier & system addresses published; reproducible builds.

---

## 10) Observability & DX

- **Metrics overlay (client):** prove time, proof size, verify gas, latency, session coverage, swap settlement times.
- **Logs:** client (prove lifecycle), server (swap orchestration), chain (events).
- **Dash:** minimal admin panel to monitor paymaster spend, session presets, prize pool.

---

## 11) Delivery Plan

### 11.1 Milestones

- **A (MVP, Week 1):**

  - Dojo world + escrow/bond systems
  - Controller sessions + paymaster (gasless)
  - **BoardCommit** circuit + **Garaga** verifier; integrate in `commit_board`
  - Torii + three.js basic board; local **Katana** flow
  - BTC deposit happy path (testnet; quote/pay/mint)

- **B (Week 2):**

  - **ShotResult** circuit + verifier; nullifiers
  - Settlement + achievements (basic)
  - BTC withdraw; metrics overlay

- **C (Polish):**

  - Verified Session preset merge; mobile deep-link (Xverse)
  - Docs + demo video

### 11.2 Risks & Mitigations

- **Browser proving latency** → keep circuits lean, precompute witnesses, worker threads; show progress. ([Aztec][11])
- **Verifier backend mismatch** → default to **Garaga-supported** path (e.g., Groth16/BN254) and keep circuit backend-agnostic. ([StarkNet][1])
- **Swap delays** → clear UI states and timeouts; Lightning recommended for deposits.

---

## 12) Repo Skeleton (monorepo)

```
zk-battleship/
├─ apps/
│  ├─ client/                 # three.js + Controller + Torii subscriptions
│  │  ├─ src/
│  │  │  ├─ components/ (Board, HUD, MetricsPanel)
│  │  │  ├─ state/ (Zustand or Redux)
│  │  │  ├─ services/
│  │  │  │  ├─ controller.ts  # session connect, execute
│  │  │  │  ├─ torii.ts       # GQL queries/subs
│  │  │  │  ├─ xverse.ts      # Sats Connect glue
│  │  │  │  └─ atomiq.ts      # swap lifecycle calls
│  │  │  ├─ zk/ (noirjs loaders, worker)
│  │  │  └─ main.ts
│  │  └─ public/
│  └─ server/                 # (optional) proxy for Atomiq if needed
│     └─ src/
├─ chain/
│  ├─ dojo/                   # Cairo models & systems
│  │  ├─ models.cairo
│  │  ├─ systems/
│  │  │  ├─ game.cairo
│  │  │  └─ escrow.cairo
│  │  ├─ Scarb.toml
│  │  └─ sozo.manifest
│  ├─ verifiers/              # Garaga output (Cairo verifier contracts)
│  └─ scripts/                # sozo build/migrate, katana, torii
├─ zk/
│  ├─ circuits/
│  │  ├─ board_commit/ (Noir)
│  │  ├─ shot_result/ (Noir)
│  │  └─ sunk_check/ (Noir, optional)
│  ├─ package.json  # noirjs
├─ docs/
│  ├─ PRD.md
│  ├─ ARCHITECTURE.md
│  └─ SPONSOR_NOTES.md
├─ .env.example
└─ README.md
```

**.env.example**

```
# Controller / Starknet
STARKNET_RPC_URL=
CONTROLLER_APP_ID=
PAYMASTER_POLICY_ID=

# Torii
TORII_GRAPHQL_URL=

# Atomiq / Garden (testnet)
ATOMIQ_API_BASE=
GARDEN_NETWORK=sepolia  # example

# Xverse (Sats Connect)
APP_DOMAIN=
APP_SCOPES=wallet_connect,sign_psbt,sign_message

# Feature flags
ENABLE_WAGERED=true
```

---

## 13) Test Plan (high level)

- **Unit:** Circuits constraints; Cairo Systems (commit/shot/timeout paths).
- **Integration:** Noir→Garaga verifier invocation; Torii subscriptions; Controller session flows (normal & expiry), paymaster sponsorship.
- **E2E:** BTC deposit (Lightning and on-chain), play 10 turns, settle, withdraw BTC.
- **Chaos:** Fail proofs, replay nullifier, stalling/timeouts, net drops during swap.

---

## 14) Appendices

### A) Why these tools

- **Dojo/Torii/Katana**: ECS-first engine + indexer + fast dev sequencer purpose-built for on-chain games. ([book.dojoengine.org][4])
- **Noir→Garaga**: Author circuits in Noir; **auto-gen Cairo verifier** for Starknet; good DX and on-chain costs. ([StarkNet][1])
- **Xverse + Atomiq/Garden**: Wallet UX for BTC/Lightning plus **trustless** BTC↔Starknet swaps. ([docs.xverse.app][3])
- **Cartridge Controller**: passkeys, session policies (**Verified Sessions**), **Paymaster** for gasless. ([docs.cartridge.gg][2])

---

That’s the full PRD. If you want, I can also add:

- a **mermaid sequence diagram** for turn resolution (prove→verify→index→render),
- a **sample `sozo` + `katana` script** to one-shot the local stack,
- and a **policy JSON** ready to submit for Verified Sessions.

[1]: https://www.starknet.io/blog/noir-on-starknet/?utm_source=chatgpt.com "Verify Noir ZK proofs on Starknet with Garaga SDK"
[2]: https://docs.cartridge.gg/controller/sessions?utm_source=chatgpt.com "Sessions and Policies"
[3]: https://docs.xverse.app/sats-connect?utm_source=chatgpt.com "Introduction | Sats Connect - Wallet API for Bitcoin ... - Xverse"
[4]: https://book.dojoengine.org/toolchain/torii?utm_source=chatgpt.com "Torii – Dojo Documentation"
[5]: https://dojoengine.org/toolchain/katana?utm_source=chatgpt.com "Katana Overview"
[6]: https://noir-lang.org/docs/?utm_source=chatgpt.com "Noir Lang | Noir Documentation"
[7]: https://www.starknet.io/blog/atomiq-wbtc-on-starknet/?utm_source=chatgpt.com "Atomiq brings wBTC to Starknet, enabling Bitcoin DeFi"
[8]: https://docs.xverse.app/sats-connect/connecting-to-the-wallet/connect-to-xverse-wallet?utm_source=chatgpt.com "Connect to Xverse Wallet - Wallet API for Bitcoin & Stacks"
[9]: https://github.com/keep-starknet-strange/garaga?utm_source=chatgpt.com "keep-starknet-strange/garaga"
[10]: https://dojoengine.org/tutorials/dojo-starter?utm_source=chatgpt.com "Dojo 101 Tutorial"
[11]: https://aztec.network/blog/announcing-noirjs-noir-applications-in-your-browser?utm_source=chatgpt.com "Announcing NoirJS: Privacy-Preserving ZK Applications In ..."
