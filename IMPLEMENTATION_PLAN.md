# Implementation Plan - ZK Battleship on Starknet

> Detailed step-by-step implementation guide for building a provably fair, Bitcoin-friendly, on-chain Battleship game using Dojo + Torii + three.js, Noir→Garaga ZK proofs on Starknet, Cartridge Controller for UX, and Xverse + Atomiq for BTC rails.

---

## Table of Contents

1. [Pre-Development Setup](#1-pre-development-setup)
2. [Phase 1: Core Infrastructure (Week 1)](#2-phase-1-core-infrastructure-week-1)
3. [Phase 2: ZK Circuits & Verification (Week 1-2)](#3-phase-2-zk-circuits--verification-week-1-2)
4. [Phase 3: Game Logic & State Management (Week 1-2)](#4-phase-3-game-logic--state-management-week-1-2)
5. [Phase 4: UI & User Experience (Week 2)](#5-phase-4-ui--user-experience-week-2)
6. [Phase 5: Bitcoin Integration (Week 2)](#6-phase-5-bitcoin-integration-week-2)
7. [Phase 6: Testing & Polish (Week 2)](#7-phase-6-testing--polish-week-2)
8. [Deployment & Production](#8-deployment--production)
9. [Risk Mitigation](#9-risk-mitigation)
10. [Success Metrics](#10-success-metrics)

---

## 1. Pre-Development Setup

### 1.1 Development Environment Setup

**Tools Installation:**

```bash
# Rust & Cairo
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
curl --proto '=https' --tlsv1.2 -sSf https://docs.starknet.io/quick_start/install.sh | sh

# Dojo toolchain
curl -L https://install.dojoengine.org | bash
dojoup

# Node.js for client & NoirJS
nvm install 18
npm install -g pnpm

# Noir for ZK circuits
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

**Version Pinning (Critical for Curve/Param Stability):**

Create a `docs/TOOLING.md` file to document exact versions:

```markdown
# Tooling Versions

Pin these versions to avoid curve/parameter drift:

- **Noir**: `0.26.0` (or latest tested with Garaga)
- **Garaga**: `<exact version from testing>`
- **Dojo**: `v0.7.x` (exact tag from testing)
- **Sozo/Katana**: Match Dojo version
- **Scarb**: `2.x.x` (compatible with Cairo 1)
- **Cairo**: `2.x.x`
- **NoirJS**: Match Noir version

Update `Cargo.toml`, `package.json`, and CI to use these exact versions.
```

**Repository Structure Setup:**

```bash
mkdir zk-battleship && cd zk-battleship
git init

# Create monorepo structure
mkdir -p {apps/{client,server},chain/{dojo,verifiers,scripts},zk/{circuits/{board_commit,shot_result},golden},docs}
```

### 1.2 Account & Service Setup

**Required Accounts/Services:**

- [ ] Starknet testnet account with funds
- [ ] Cartridge Controller app registration
- [ ] Xverse wallet (testnet)
- [ ] Atomiq API access (testnet)
- [ ] GitHub repository setup

**Environment Configuration:**

```bash
cp .env.example .env
# Fill in all required values per PRD section 12
```

---

## 2. Phase 1: Core Infrastructure (Week 1)

### 2.1 Dojo World Setup (Days 1-2)

**Step 1: Initialize Dojo Project**

```bash
cd chain/dojo
sozo init battleship
```

**Step 2: Define Core Models** (`models.cairo`)

```cairo
// Game status enum
#[derive(Copy, Drop, Serde, PartialEq)]
enum GameStatus {
    Created: u8 = 0,
    Started: u8 = 1,
    Finished: u8 = 2,
    Cancelled: u8 = 3
}

// Implement models per PRD section 3.2:
- Game {
    #[key] id: felt252,
    p1: ContractAddress,
    p2: ContractAddress,
    status: GameStatus,        // Enum type for compile-time safety
    turn_player: ContractAddress,
    board_size: u8,
    rules_hash: felt252,        // locked on first commit
    turn_no: u32,              // starts at 0
    last_action: u64,          // unix timestamp
    winner: ContractAddress,   // 0 or address
    start_deadline: u64        // reveal deadline for coin-flip (0 if not set)
  }
- BoardCommit { #[key] game_id, #[key] player, commitment, rules_hash }
- PendingShot { #[key] game_id, #[key] turn_no, shooter, x, y }  // shooter, x, y are non-key: only one pending shot per turn
- AttackerShot { #[key] game_id, #[key] attacker, #[key] x, #[key] y }  // duplicate shot guard
- Shot { #[key] game_id, #[key] turn_no, x, y, result }
- NullifierSet { #[key] game_id, #[key] nullifier }
- CellHit { #[key] game_id, #[key] player, #[key] x, #[key] y, hit: bool }  // prevent double-counting hits
- ShipAliveCount { #[key] game_id, #[key] player, remaining_hits: u8 }  // deterministic win condition (17→0)
- StartCommit { #[key] game_id, #[key] player, commit, timestamp }  // coin-flip commit phase
- StartReveal { #[key] game_id, #[key] player, nonce }  // coin-flip reveal phase
- Escrow { #[key] game_id, token, stake_p1, stake_p2, bond_p1, bond_p2 }  // token: OpenZeppelin Cairo IERC20

// GAME RULE: Turn always alternates (no extra shot on hit).
// Attacker fires → Defender proves → Turn flips regardless of hit/miss.
// Win is checked BEFORE turn flip to award correct player.

// SECURITY NOTE: AttackerShot records are NEVER deleted.
// This prevents an attacker from re-targeting the same cell across the entire game.
// Intentional design choice for game fairness.

// RECOMMENDED: Add events for key state transitions
#[derive(Drop, starknet::Event)]
enum GameEvent {
    GameCreated { game_id: felt252, p1: ContractAddress, p2: ContractAddress },
    BoardsReady { game_id: felt252 }, // Both players committed boards
    ShotFired { game_id: felt252, turn_no: u32, x: u8, y: u8 },
    ShotResolved { game_id: felt252, turn_no: u32, x: u8, y: u8, result: u8 },
    GameFinished { game_id: felt252, winner: ContractAddress, final_turn: u32 },
    EscrowSettled { game_id: felt252, winner: ContractAddress, total_payout: u256 },
    GameCancelled { game_id: felt252 },
}

// Emit events at key points:
// - create_game() → GameCreated
// - commit_board() when both committed → BoardsReady
// - fire_shot() → ShotFired
// - apply_shot_proof() → ShotResolved
// - finalize_win() → GameFinished + EscrowSettled (if funded)
// - cancel_unstarted() → GameCancelled
```

**Step 3: Implement Core Systems** (`systems/`)

```cairo
// systems/game.cairo
#[system]
impl IGameManagement {
    fn create_game(p2: ContractAddress, board_size: u8) -> felt252 {
        use starknet::hash::pedersen::pedersen;
        use traits::TryInto;

        let p1 = get_caller_address();

        // Enforce 10×10 board size (circuits hardcoded for this)
        errors::require(board_size == 10, 'BAD_BOARD_SIZE');

        // Generate game ID (e.g., hash of p1, p2, timestamp)
        let game_id = pedersen(
            contract_address_to_felt252(p1),
            pedersen(contract_address_to_felt252(p2), starknet::get_block_timestamp().into())
        );

        // Zero ContractAddress for initialization
        let zero_ca: ContractAddress = 0.try_into().expect('ZERO_CA');

        // Create game
        set!(world, Game {
            id: game_id,
            p1,
            p2,
            status: GameStatus::Created,
            turn_player: zero_ca, // Set after coin-flip
            board_size,
            rules_hash: 0,
            turn_no: 0,
            last_action: starknet::get_block_timestamp(),
            winner: zero_ca, // Set when game finishes
            start_deadline: 0,
        });

        // Emit event
        emit!(world, GameEvent::GameCreated { game_id, p1, p2 });

        game_id
    }
}

// Coin-flip via commit-reveal (determines first player)
#[system]
impl IStartGame {
    fn start_game_commit(game_id: felt252, commit: felt252) {
        let caller = get_caller_address();
        let g = get!(world, Game { id: game_id });

        // Guard: only players can commit
        errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

        // Guard: can't commit twice
        let existing = get_opt_start_commit(world, game_id, caller);
        errors::require(existing.is_none(), 'ALREADY_COMMITTED_FLIP');

        // Record commitment
        set!(world, StartCommit {
            game_id,
            player: caller,
            commit,
            timestamp: starknet::get_block_timestamp()
        });

        // If both players committed, set reveal deadline
        let p1_commit = get_opt_start_commit(world, game_id, g.p1);
        let p2_commit = get_opt_start_commit(world, game_id, g.p2);

        if p1_commit.is_some() && p2_commit.is_some() {
            let mut g2 = g;
            g2.start_deadline = starknet::get_block_timestamp() + START_REVEAL_DEADLINE;
            set!(world, Game { ..g2 });
        }
    }

    fn start_game_reveal(game_id: felt252, nonce: felt252) {
        let caller = get_caller_address();
        let g = get!(world, Game { id: game_id });

        // Guard: both commits must exist before any reveal (prevents early reveal bias)
        let c1 = get_opt_start_commit(world, game_id, g.p1);
        let c2 = get_opt_start_commit(world, game_id, g.p2);
        errors::require(c1.is_some() && c2.is_some(), 'COMMITS_NOT_COMPLETE');

        // Guard: can't reveal twice
        let existing_reveal = get_opt_start_reveal(world, game_id, caller);
        errors::require(existing_reveal.is_none(), 'ALREADY_REVEALED_FLIP');

        // Guard: deadline must be set and not passed
        errors::require(
            g.start_deadline != 0 && starknet::get_block_timestamp() <= g.start_deadline,
            'REVEAL_DEADLINE_PASSED'
        );

        // Fetch commitment
        let commit_rec = get!(world, StartCommit { game_id, player: caller });

        // Verify commitment with domain-separated hash
        let expected_commit = coin_commit(game_id, caller, nonce);
        errors::require(commit_rec.commit == expected_commit, 'INVALID_COMMIT');

        // Store reveal
        set!(world, StartReveal { game_id, player: caller, nonce });

        // If both revealed, determine starting player
        let p1_reveal = get_opt_start_reveal(world, game_id, g.p1);
        let p2_reveal = get_opt_start_reveal(world, game_id, g.p2);

        if p1_reveal.is_some() && p2_reveal.is_some() {
            // Require boards committed before starting (prevents choosing placement after coin-flip)
            let bc1 = get_opt_board_commit(world, game_id, g.p1);
            let bc2 = get_opt_board_commit(world, game_id, g.p2);
            errors::require(bc1.is_some() && bc2.is_some(), 'BOARDS_NOT_COMMITTED');

            let combined = p1_reveal.unwrap().nonce ^ p2_reveal.unwrap().nonce;
            let mut g2 = g;
            g2.turn_player = if (combined % 2) == 0 { g.p1 } else { g.p2 };
            g2.status = GameStatus::Started;
            g2.last_action = starknet::get_block_timestamp();
            set!(world, Game { ..g2 });
        }
    }
}

// If player fails to reveal by deadline, opponent can timeout and claim first turn + slash bond
#[system]
impl IFlipTimeout {
    fn timeout_flip(game_id: felt252) {
        let mut g = get!(world, Game { id: game_id });
        errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');
        errors::require(g.start_deadline != 0, 'NO_DEADLINE');
        errors::require(starknet::get_block_timestamp() > g.start_deadline, 'DEADLINE_NOT_PASSED');

        // Both commits must exist
        let c1 = get_opt_start_commit(world, game_id, g.p1);
        let c2 = get_opt_start_commit(world, game_id, g.p2);
        errors::require(c1.is_some() && c2.is_some(), 'COMMITS_NOT_COMPLETE');

        // Exactly one reveal present (XOR)
        let r1 = get_opt_start_reveal(world, game_id, g.p1);
        let r2 = get_opt_start_reveal(world, game_id, g.p2);
        errors::require(r1.is_some() ^ r2.is_some(), 'NOT_EXACTLY_ONE_REVEAL');

        let revealer = if r1.is_some() { g.p1 } else { g.p2 };
        let non_revealer = if revealer == g.p1 { g.p2 } else { g.p1 };

        // Require boards committed before starting (prevents choosing placement after knowing who goes first)
        let bc1 = get_opt_board_commit(world, game_id, g.p1);
        let bc2 = get_opt_board_commit(world, game_id, g.p2);
        errors::require(bc1.is_some() && bc2.is_some(), 'BOARDS_NOT_COMMITTED');

        // Slash non-revealer's bond to revealer (if escrow exists)
        let e_opt = get_opt_escrow(world, game_id);
        if e_opt.is_some() {
            let mut e = e_opt.unwrap();
            let slashed = if non_revealer == g.p1 { e.bond_p1 } else { e.bond_p2 };
            if slashed != 0 {
                transfer_token(e.token, revealer, slashed);
                if non_revealer == g.p1 { e.bond_p1 = 0; } else { e.bond_p2 = 0; }
                set!(world, Escrow { ..e });
            }
        }

        // Start the game, revealer goes first
        g.status = GameStatus::Started;
        g.turn_player = revealer;
        g.last_action = starknet::get_block_timestamp();
        set!(world, Game { ..g });
    }
}

- timeout(player) // bond slashing for action timeout during match

// Resign flow: player forfeits and opponent wins
#[system]
impl IResign {
    fn resign(game_id: felt252) {
        let caller = get_caller_address();
        let g = get!(world, Game { id: game_id });

        // Only players can resign
        errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

        // Can only resign during active game
        errors::require(g.status == GameStatus::Started, 'NOT_STARTED');

        // Opponent wins
        let winner = get_opponent(world, game_id, caller);

        // Use finalize_win which handles escrow (stakes to winner, bonds refunded to both)
        finalize_win(world, game_id, winner);
    }
}

// Cancel path for unstarted games with grace period
#[system]
impl IGameCancel {
    fn cancel_unstarted(game_id: felt252) {
        let g = get!(world, Game { id: game_id });
        let caller = get_caller_address();
        let now = starknet::get_block_timestamp();

        // Only players can cancel
        errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

        // Can only cancel if not started or finished
        errors::require(g.status != GameStatus::Started, 'GAME_STARTED');
        errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');

        // Check commit status
        let c1 = get_opt_start_commit(world, game_id, g.p1);
        let c2 = get_opt_start_commit(world, game_id, g.p2);

        // Can cancel if:
        // - no commits at all, OR
        // - only one commit and grace period passed, OR
        // - reveal deadline passed (both committed but reveal failed)
        let no_commits = c1.is_none() && c2.is_none();
        let one_commit_grace = (c1.is_some() ^ c2.is_some()) && {
            let commit_time = if c1.is_some() { c1.unwrap().timestamp } else { c2.unwrap().timestamp };
            now > commit_time + CANCEL_GRACE
        };
        let reveal_deadline_passed = g.start_deadline != 0 && now > g.start_deadline;

        errors::require(
            no_commits || one_commit_grace || reveal_deadline_passed,
            'CANNOT_CANCEL_YET'
        );

        // Set status to cancelled
        let mut g2 = g;
        g2.status = GameStatus::Cancelled;
        set!(world, Game { ..g2 });

        // Emit event
        emit!(world, GameEvent::GameCancelled { game_id });
    }
}

// systems/escrow.cairo
#[system]
impl IEscrow {
    fn stake_and_bond(game_id: felt252, token: ContractAddress, stake: u256, bond: u256) {
        let caller = get_caller_address();
        let total = stake + bond;

        // Enforce single token per game
        let existing_escrow = get_opt_escrow(world, game_id);
        if existing_escrow.is_some() {
            errors::require(existing_escrow.unwrap().token == token, 'TOKEN_MISMATCH');
        }

        // Pull funds INTO escrow contract via transfer_from
        // Caller must have already approved this amount to the escrow contract
        let erc20 = IERC20Dispatcher { contract_address: token };
        erc20.transfer_from(caller, get_contract_address(), total);

        let mut e = existing_escrow.unwrap_or(Escrow {
            game_id,
            token,
            stake_p1: 0,
            stake_p2: 0,
            bond_p1: 0,
            bond_p2: 0,
        });

        // Attribute balances to p1/p2 based on role
        let g = get!(world, Game { id: game_id });
        if caller == g.p1 {
            // Prevent double funding
            errors::require(e.stake_p1 == 0 && e.bond_p1 == 0, 'ALREADY_FUNDED');
            e.stake_p1 = stake;
            e.bond_p1 = bond;
        } else if caller == g.p2 {
            // Prevent double funding
            errors::require(e.stake_p2 == 0 && e.bond_p2 == 0, 'ALREADY_FUNDED');
            e.stake_p2 = stake;
            e.bond_p2 = bond;
        } else {
            errors::require(false, 'NOT_PLAYER');
        }

        set!(world, Escrow { ..e });
    }

    fn settle_escrow(game_id: felt252) {
        let g = get!(world, Game { id: game_id });
        errors::require(g.status == GameStatus::Finished, 'GAME_NOT_FINISHED');

        let mut e = get!(world, Escrow { game_id });
        settle_escrow_internal_for_winner(game_id, g.winner, &mut e);
        set!(world, Escrow { ..e });
    }

    fn refund_bond(game_id: felt252) {
        // For cancelled games, refund all stakes and bonds
        let g = get!(world, Game { id: game_id });
        errors::require(g.status == GameStatus::Cancelled, 'NOT_CANCELLED');

        let mut e = get!(world, Escrow { game_id });
        transfer_token(e.token, g.p1, e.stake_p1 + e.bond_p1);
        transfer_token(e.token, g.p2, e.stake_p2 + e.bond_p2);
        e.stake_p1 = 0;
        e.stake_p2 = 0;
        e.bond_p1 = 0;
        e.bond_p2 = 0;
        set!(world, Escrow { ..e });
    }
}

// errors.cairo - Cairo 1 compatible error handling
mod errors {
    use array::ArrayTrait;

    fn require(cond: bool, code: felt252) {
        if !cond {
            let mut data = ArrayTrait::new();
            data.append(code);
            panic(data);
        }
    }
}

// constants.cairo - Single source of truth for game constants
const TIMEOUT_DURATION: u64 = 120; // 2 minutes in seconds
const BSCM_TAG: felt252 = 0x4253434D; // "BSCM" - Board Commitment domain tag
const BSHOT_TAG: felt252 = 0x42534854; // "BSHT" - Shot nullifier domain tag
const COIN_TAG: felt252 = 0x434F494E; // "COIN" - Coin-flip commitment domain tag
const TOTAL_SHIP_CELLS: u8 = 17; // Carrier(5) + Battleship(4) + Cruiser(3) + Submarine(3) + Destroyer(2)
const START_REVEAL_DEADLINE: u64 = 300; // 5 minutes to reveal after both commits
const CANCEL_GRACE: u64 = 300; // 5 minutes grace before allowing cancel with one commit

// helpers.cairo
use starknet::contract_address::ContractAddress;
use starknet::contract_address_to_felt252;
use openzeppelin::token::erc20::interface::IERC20Dispatcher;

// Helper for optional data access using sentinel field checks
// For each model, check a field that's guaranteed non-zero when the record exists

fn get_opt_board_commit(world: IWorldDispatcher, game_id: felt252, player: ContractAddress) -> Option<BoardCommit> {
    let rec = get!(world, BoardCommit { game_id, player });
    if rec.commitment != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_pending_shot(world: IWorldDispatcher, game_id: felt252, turn_no: u32) -> Option<PendingShot> {
    let rec = get!(world, PendingShot { game_id, turn_no });
    if contract_address_to_felt252(rec.shooter) != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_start_commit(world: IWorldDispatcher, game_id: felt252, player: ContractAddress) -> Option<StartCommit> {
    let rec = get!(world, StartCommit { game_id, player });
    if rec.commit != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_start_reveal(world: IWorldDispatcher, game_id: felt252, player: ContractAddress) -> Option<StartReveal> {
    let rec = get!(world, StartReveal { game_id, player });
    // Sentinel on player, not nonce (0 is a valid nonce value)
    if contract_address_to_felt252(rec.player) != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_attacker_shot(world: IWorldDispatcher, game_id: felt252, attacker: ContractAddress, x: u8, y: u8) -> Option<AttackerShot> {
    let rec = get!(world, AttackerShot { game_id, attacker, x, y });
    if contract_address_to_felt252(rec.attacker) != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_nullifier(world: IWorldDispatcher, game_id: felt252, nullifier: felt252) -> Option<NullifierSet> {
    let rec = get!(world, NullifierSet { game_id, nullifier });
    if rec.nullifier != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_escrow(world: IWorldDispatcher, game_id: felt252) -> Option<Escrow> {
    let rec = get!(world, Escrow { game_id });
    if contract_address_to_felt252(rec.token) != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_cell_hit(world: IWorldDispatcher, game_id: felt252, player: ContractAddress, x: u8, y: u8) -> Option<CellHit> {
    let rec = get!(world, CellHit { game_id, player, x, y });
    if contract_address_to_felt252(rec.player) != 0 { Option::Some(rec) } else { Option::None }
}

fn get_opt_ship_alive_count(world: IWorldDispatcher, game_id: felt252, player: ContractAddress) -> Option<ShipAliveCount> {
    let rec = get!(world, ShipAliveCount { game_id, player });
    if contract_address_to_felt252(rec.player) != 0 { Option::Some(rec) } else { Option::None }
}

// Token transfer helper (from escrow to recipient)
fn transfer_token(token: ContractAddress, to: ContractAddress, amount: u256) {
    if amount == 0 { return; }
    // Transfer from escrow (this contract) to recipient
    let erc20 = IERC20Dispatcher { contract_address: token };
    erc20.transfer(to, amount);
}

// Escrow settlement helper
fn settle_escrow_internal_for_winner(game_id: felt252, winner: ContractAddress, escrow: ref Escrow) {
    let total = escrow.stake_p1 + escrow.stake_p2;
    transfer_token(escrow.token, winner, total);
    escrow.stake_p1 = 0;
    escrow.stake_p2 = 0;
}

// Game helper functions (all take world dispatcher)
fn get_attacker_address(world: IWorldDispatcher, game_id: felt252) -> ContractAddress {
    let g = get!(world, Game { id: game_id });
    g.turn_player
}

fn get_defender_address(world: IWorldDispatcher, game_id: felt252) -> ContractAddress {
    let g = get!(world, Game { id: game_id });
    if g.turn_player == g.p1 { g.p2 } else { g.p1 }
}

fn get_opponent(world: IWorldDispatcher, game_id: felt252, who: ContractAddress) -> ContractAddress {
    let g = get!(world, Game { id: game_id });
    if who == g.p1 { g.p2 } else { g.p1 }
}

fn get_game_rules_hash(world: IWorldDispatcher, game_id: felt252) -> felt252 {
    let g = get!(world, Game { id: game_id });
    g.rules_hash
}

fn expected_offender(world: IWorldDispatcher, game_id: felt252) -> ContractAddress {
    let g = get!(world, Game { id: game_id });
    // If there's a pending shot this turn, we're waiting on the defender's proof
    let pending = get_opt_pending_shot(world, game_id, g.turn_no);
    if pending.is_some() {
        get_defender_address(world, game_id)
    } else {
        g.turn_player
    }
}

// Coin-flip commitment with domain separation
fn coin_commit(game_id: felt252, player: ContractAddress, nonce: felt252) -> felt252 {
    use starknet::hash::pedersen::pedersen;
    // Domain-separated: pedersen(pedersen(COIN_TAG, game_id), pedersen(player_felt, nonce))
    let a = pedersen(COIN_TAG, game_id);
    let b = pedersen(contract_address_to_felt252(player), nonce);
    pedersen(a, b)
}
```

**Step 4: Local Development Setup**

```bash
# Terminal 1: Start Katana
katana --dev

# Terminal 2: Build & migrate
sozo build
sozo migrate

# Terminal 3: Start Torii
torii --world 0x... --database-url sqlite://torii.db
```

**Step 5: Mock ERC20 for Development**

```cairo
// Deploy mock BATTLE token for testing escrow flows
// Add faucet contract for easy balance distribution
// DEV NOTE: Use faucet → approve(escrow, stake+bond) → stake_and_bond to avoid Atomiq dependency
```

**Deliverable:** Working local Dojo world with basic game creation and escrow + mock token

### 2.2 Basic Client Setup (Days 2-3)

**Step 1: Initialize Client App**

```bash
cd apps/client
pnpm create vite battleship-client --template react-ts
pnpm install
```

**Step 2: Install Dependencies**

```bash
pnpm add three @types/three @react-three/fiber @react-three/drei
pnpm add @cartridge/controller @cartridge/presets
pnpm add @dojoengine/core @dojoengine/torii-client
pnpm add zustand graphql graphql-request
```

**Step 3: Basic Three.js Scene**

```typescript
// src/components/GameBoard.tsx
// Basic 10x10 grid with three.js
// Click handlers for cell selection
// Camera controls and lighting
```

**Step 4: Torii Integration**

```typescript
// src/services/torii.ts
// GraphQL client setup
// Subscriptions for Game, Shot, CellHit, ShipAliveCount
// Real-time state updates

// RECOMMENDED: Use GraphQL Code Generator to generate TypeScript types from Torii schema
// This keeps your client types in sync with on-chain models
// pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript
// Run: graphql-codegen --config codegen.yml
```

**Deliverable:** Basic 3D board rendering with Torii connectivity

---

## 3. Phase 2: ZK Circuits & Verification (Week 1-2)

### 3.1 Noir Circuits Development (Days 3-5)

**Step 1: BoardCommit Circuit** (`zk/circuits/board_commit/`)

```rust
// src/main.nr
fn main(
    game_id: Field,
    player_addr: Field,
    board: [[u8; 10]; 10],
    salt: Field,
    ships: [Ship; 5]  // standard battleship fleet
) -> pub (Field, Field) {
    // Validate ship placement:
    // - Correct ship counts/sizes
    // - No overlaps
    // - Within grid bounds
    // - Optional: no adjacency

    // Domain-separated commitment to prevent cross-game reuse
    // NOTE: Keep in sync with constants.cairo BSCM_TAG
    const BSCM_TAG: Field = 0x4253434D;  // "BSCM" as Field
    let commitment = poseidon_hash_board_with_salt_tagged(
        [BSCM_TAG, game_id, player_addr],
        board,
        salt
    );
    let rules_hash = hash_ship_rules(ships);

    (commitment, rules_hash)
}
```

**Step 2: ShotResult Circuit** (`zk/circuits/shot_result/`)

```rust
// src/main.nr
fn main(
    board: [[u8; 10]; 10],
    salt: Field,
    game_id: Field,
    defender_address: Field,
    rules_hash: Field,          // PUBLIC INPUT - don't recompute
    x: u8,
    y: u8,
    secret: Field               // for nullifier
) -> pub (Field, Field, Field, Field, u8, u8, u8, Field) {
    // MUST match BoardCommit circuit - same domain separation
    // NOTE: Keep in sync with constants.cairo BSCM_TAG and BSHOT_TAG
    const BSCM_TAG: Field = 0x4253434D;  // "BSCM" as Field
    let commitment = poseidon_hash_board_with_salt_tagged(
        [BSCM_TAG, game_id, defender_address],
        board,
        salt
    );
    constrain_with_board_rules(board);  // lightweight validation only

    // result
    let result: u8 = if board[x][y] > 0 { 1 } else { 0 };

    // domain-separated nullifier (single Poseidon hash)
    // Poseidon tag (ensure BN254 field compatibility)
    // NOTE: Keep in sync with constants.cairo BSHOT_TAG
    const BSHOT_TAG: Field = 0x42534854;  // "BSHT" as Field
    let nullifier = poseidon([BSHOT_TAG, game_id, defender_address, x.into(), y.into(), secret]);
    // Note: Ensure Cairo uses same BN254 Poseidon parameters for cross-verification

    // PUBLIC OUTPUT ORDER (CRITICAL - must match verifier):
    // (commitment, rules_hash, game_id, defender_address, x, y, result, nullifier)
    (commitment, rules_hash, game_id, defender_address, x, y, result, nullifier)
}
```

**Step 3: Circuit Testing**

```bash
cd zk/circuits/board_commit
nargo test

cd ../shot_result
nargo test
```

**Step 4: Generate Proving/Verifying Keys**

```bash
# For each circuit
nargo compile
# Export for NoirJS browser usage
```

**Deliverable:** Working Noir circuits with comprehensive tests

### 3.2 Garaga Verifier Integration (Days 5-6)

**Step 1: Generate Cairo Verifiers**

```bash
# CRITICAL: Use exact flag order for your Garaga version
# Standard: --backend groth16 --curve bn254
# Verify with `garaga generate-verifier --help` and document exact command in TOOLING.md
garaga generate-verifier --circuit board_commit --backend groth16 --curve bn254
garaga generate-verifier --circuit shot_result --backend groth16 --curve bn254
# Place output in chain/verifiers/

# NOTE: If Garaga version differs, confirm curve/backend order and update here + TOOLING.md
# Ensure Poseidon hash alignment between Noir and Cairo (BN254 field)
```

**Step 2: Integrate Verifiers in Dojo Systems**

```cairo
// systems/proof_verify.cairo
use verifiers::board_commit_verifier;
use verifiers::shot_result_verifier;

#[system]
impl ICommitBoard {
    fn commit_board(
        game_id: felt252,
        commitment: felt252,
        rules_hash: felt252,
        proof: Span<felt252>
    ) {
        let caller = get_caller_address();
        let g = get!(world, Game { id: game_id });

        // Guard: only players can commit
        errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

        // Guard: can't commit after game has started or finished
        errors::require(g.status != GameStatus::Started, 'ALREADY_STARTED');
        errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');

        // Guard: board size must be 10×10 (circuits hardcoded)
        errors::require(g.board_size == 10, 'BAD_BOARD_SIZE');

        // Call Garaga verifier
        errors::require(
            board_commit_verifier::verify(proof, commitment, rules_hash),
            'INVALID_PROOF'
        );

        // Each player can only commit once (check using only key fields)
        let prior = get_opt_board_commit(world, game_id, caller);
        errors::require(prior.is_none(), 'ALREADY_COMMITTED');

        // Lock rules to game on first commit (explicit guard prevents accidental conflicts)
        let mut g2 = g;
        if g2.rules_hash == 0 {
            g2.rules_hash = rules_hash;
            set!(world, Game { ..g2 });
        }
        errors::require(g2.rules_hash == 0 || g2.rules_hash == rules_hash, 'RULES_MISMATCH');

        // Store commitment
        set!(world, BoardCommit {
            game_id,
            player: caller,
            commitment,
            rules_hash
        });

        // If both players have now committed, update last_action and emit event
        let bc1 = get_opt_board_commit(world, game_id, g.p1);
        let bc2 = get_opt_board_commit(world, game_id, g.p2);
        if bc1.is_some() && bc2.is_some() {
            let mut g3 = g2;
            g3.last_action = starknet::get_block_timestamp();
            set!(world, Game { ..g3 });

            // Emit BoardsReady for smoother lobby UX
            emit!(world, GameEvent::BoardsReady { game_id });
        }
    }
}

#[system]
impl IApplyShotProof {
    fn apply_shot_proof(
        game_id: felt252,
        x: u8, y: u8,
        result: u8,
        nullifier: felt252,
        rules_hash: felt252,
        proof: Span<felt252>
    ) {
        let g = get!(world, Game { id: game_id });

        // Guard: game must be started (prevents weird flip-timeout edge cases)
        errors::require(g.status == GameStatus::Started, 'NOT_STARTED');

        let defender = get_defender_address(world, game_id);
        let attacker = get_attacker_address(world, game_id);

        // Bind to pending shot (prevent arbitrary coordinates)
        // Fetch by keys only, then validate coordinates
        let ps = get!(world, PendingShot { game_id, turn_no: g.turn_no });
        errors::require(ps.turn_no == g.turn_no, 'STALE_PENDING_SHOT');
        errors::require(ps.shooter == attacker, 'WRONG_SHOOTER');
        errors::require(ps.x == x && ps.y == y, 'WRONG_COORDS');

        // Only defender can provide shot result
        errors::require(get_caller_address() == defender, 'ONLY_DEFENDER');

        let bc = get!(world, BoardCommit { game_id, player: defender });
        let commitment = bc.commitment;

        // verify (order must match circuit publics)
        // CRITICAL: Order is (commitment, rules_hash, game_id, defender, x, y, result, nullifier)
        // Type alignment: cast all inputs to felt252 for verifier
        errors::require(
            shot_result_verifier::verify(
            proof,
            commitment,
            rules_hash,
            game_id,
                contract_address_to_felt252(defender),     // Cast ContractAddress to felt252
            x.into(), y.into(),  // Cast u8 to felt252
            result.into(),
            nullifier
            ),
            'INVALID_SHOT_PROOF'
        );

        // lock rules to game
        let game_rules_hash = get_game_rules_hash(world, game_id);
        errors::require(rules_hash == game_rules_hash, 'RULES_CHANGED');

        // nullifier replay guard (check BEFORE writing Shot to avoid partial state)
        // Block zero nullifier (astronomically rare but possible)
        errors::require(nullifier != 0, 'BAD_NULLIFIER');
        errors::require(
            get_opt_nullifier(world, game_id, nullifier).is_none(),
            'REPLAY'
        );

        // Write shot at CURRENT turn for consistency with PendingShot
        set!(world, Shot { game_id, turn_no: g.turn_no, x, y, result });
        set!(world, NullifierSet { game_id, nullifier });

        // Emit event for shot resolution
        emit!(world, GameEvent::ShotResolved { game_id, turn_no: g.turn_no, x, y, result });

        // CRITICAL: Apply hit & check win BEFORE flipping turn (attacker is still correct)
        let did_win = apply_hit_and_check_win(world, game_id, defender, x, y, result);

        // Consume the pending shot (use only key fields)
        // NOTE: Dojo versions vary - confirm macro name (delete! vs pop! vs world.delete())
        delete!(world, PendingShot { game_id, turn_no: ps.turn_no });

        if did_win {
            finalize_win(world, game_id, attacker); // award to current (pre-flip) attacker
            return;
        }

        // Otherwise, flip turn & bump timer & increment turn number
        let mut g2 = g;
        g2.turn_player = defender; // defender becomes next attacker
        g2.turn_no += 1; // increment turn for next shot
        g2.last_action = starknet::get_block_timestamp();
        set!(world, Game { ..g2 });
    }
}

// Deterministic ship sinking: apply hit and check if game is won
fn apply_hit_and_check_win(world: IWorldDispatcher, game_id: felt252, defender: ContractAddress, x: u8, y: u8, result: u8) -> bool {
    if result == 0 { return false; } // Miss, nothing to update

    // Track hits per cell to prevent double-counting
    let existing_ch = get_opt_cell_hit(world, game_id, defender, x, y);
    let mut ch = existing_ch.unwrap_or(CellHit { game_id, player: defender, x, y, hit: false });

    if ch.hit { return false; } // Already counted this hit
    ch.hit = true;
    set!(world, CellHit { ..ch });

    // Standard Battleship fleet: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)
    // Use TOTAL_SHIP_CELLS constant for single source of truth
    let existing_alive = get_opt_ship_alive_count(world, game_id, defender);
    let mut alive = existing_alive.unwrap_or(ShipAliveCount { game_id, player: defender, remaining_hits: TOTAL_SHIP_CELLS });

    alive.remaining_hits -= 1;
    set!(world, ShipAliveCount { ..alive });

    // Return true if all ships sunk
    alive.remaining_hits == 0
}

// Finalize win: set game status and auto-settle escrow
fn finalize_win(world: IWorldDispatcher, game_id: felt252, winner: ContractAddress) {
        let mut g = get!(world, Game { id: game_id });
    g.status = GameStatus::Finished;
    g.winner = winner;
        set!(world, Game { ..g });

    // Auto-settle escrow (if it exists - may not be funded)
    let e_opt = get_opt_escrow(world, game_id);
    if e_opt.is_some() {
        let mut e = e_opt.unwrap();
        let total_payout = e.stake_p1 + e.stake_p2;

        // Transfer stakes to winner
        settle_escrow_internal_for_winner(game_id, winner, &mut e);

        // Refund bonds to original owners (they both played correctly)
        transfer_token(e.token, g.p1, e.bond_p1);
        transfer_token(e.token, g.p2, e.bond_p2);
        e.bond_p1 = 0;
        e.bond_p2 = 0;

        set!(world, Escrow { ..e });

        emit!(world, GameEvent::EscrowSettled { game_id, winner, total_payout });
    }

    // Always emit GameFinished with final turn for analytics
    emit!(world, GameEvent::GameFinished { game_id, winner, final_turn: g.turn_no });
}
```

**Deliverable:** On-chain proof verification working in local Dojo

---

## 4. Phase 3: Game Logic & State Management (Week 1-2)

### 4.1 Complete Game Systems (Days 4-6)

**Step 1: Shot & Turn Management**

```cairo
// systems/gameplay.cairo
#[system]
impl IFireShot {
    fn fire_shot(game_id: felt252, x: u8, y: u8) {
        let mut g = get!(world, Game { id: game_id });

        // Guard: game must be started
        errors::require(g.status == GameStatus::Started, 'NOT_STARTED');

        // Guard: both players must have committed boards
        let bc1 = get_opt_board_commit(world, game_id, g.p1);
        let bc2 = get_opt_board_commit(world, game_id, g.p2);
        errors::require(bc1.is_some() && bc2.is_some(), 'BOARDS_NOT_COMMITTED');

        // Only current attacker may act
        errors::require(get_caller_address() == g.turn_player, 'NOT_YOUR_TURN');

        // Bounds check
        errors::require(x < g.board_size && y < g.board_size, 'OUT_OF_BOUNDS');

        // Prevent multiple pending shots this turn (block ANY pending shot for this turn)
        // Key on only indexed fields to prevent attacker from opening multiple pendings
        let pending = get_opt_pending_shot(world, game_id, g.turn_no);
        errors::require(pending.is_none(), 'ALREADY_PENDING');

        // Guard against duplicate targeting by same attacker (all turns)
        // AttackerShot keyed by (game_id, attacker, x, y) - never delete to prevent re-targeting same cell
        let already = get_opt_attacker_shot(world, game_id, get_caller_address(), x, y);
        errors::require(already.is_none(), 'ALREADY_SHOT_HERE');

        // Record shot attempt to prevent duplicates
        set!(world, AttackerShot {
            game_id,
            attacker: get_caller_address(),
            x,
            y
        });

        // Record pending shot
        set!(world, PendingShot {
            game_id,
            turn_no: g.turn_no,
            shooter: get_caller_address(),
            x,
            y
        });

        // Update last_action to start defender's timer
        g.last_action = starknet::get_block_timestamp();
        set!(world, Game { ..g });

        // Emit event
        emit!(world, GameEvent::ShotFired { game_id, turn_no: g.turn_no, x, y });

        // Switch to defend phase - defender must now provide proof
    }
}
```

**Step 2: Ship Tracking & Win Conditions**

Deterministic ship sinking is now implemented in `apply_hit_and_check_win()` within the proof verification flow (see above). This function:

- Tracks hits per cell to prevent double-counting
- Decrements remaining ship cells (17 total for standard fleet)
- Returns true if all ships sunk (17 hits counted)
- Win finalization handled by `finalize_win()` which settles escrow and refunds bonds
- No additional ZK proofs required

**Step 3: Timeout & Anti-Grief**

```cairo
#[system]
impl ITimeout {
    fn timeout(game_id: felt252) {
        let g = get!(world, Game { id: game_id });

        // Determine who we're waiting on (defender if pending shot exists, else attacker)
        let offender = expected_offender(world, game_id);
        let caller = get_caller_address();

        // Only opponent can call timeout
        errors::require(caller == get_opponent(world, game_id, offender), 'ONLY_OPPONENT');

        // Check timeout conditions
        let now = starknet::get_block_timestamp();
        errors::require(now > g.last_action + TIMEOUT_DURATION, 'NOT_TIMED_OUT');

        let winner = get_opponent(world, game_id, offender);

        // Slash bond and settle escrow (if it exists)
        let e_opt = get_opt_escrow(world, game_id);
        let total_payout = if e_opt.is_some() {
            let mut escrow = e_opt.unwrap();

        // Transfer slashed bond from offender to winner
            let slashed_bond = if offender == g.p1 { escrow.bond_p1 } else { escrow.bond_p2 };
            if slashed_bond != 0 {
                transfer_token(escrow.token, winner, slashed_bond);
            }

            if offender == g.p1 {
            escrow.bond_p1 = 0;  // Zero p1 bond after transfer
        } else {
            escrow.bond_p2 = 0;  // Zero p2 bond after transfer
        }

        // Settle stakes to winner as well
            let stakes_total = escrow.stake_p1 + escrow.stake_p2;
        settle_escrow_internal_for_winner(game_id, winner, &mut escrow);

            // Refund winner's bond (they played correctly)
            let winner_bond = if winner == g.p1 { escrow.bond_p1 } else { escrow.bond_p2 };
            if winner_bond != 0 {
                transfer_token(escrow.token, winner, winner_bond);
            }
            if winner == g.p1 {
                escrow.bond_p1 = 0;
            } else {
                escrow.bond_p2 = 0;
            }

            set!(world, Escrow { ..escrow });
            stakes_total
        } else {
            0 // No escrow, no payout
        };

        // Set winner and finish game
        let mut g2 = g;
        g2.status = GameStatus::Finished;
        g2.winner = winner;
        set!(world, Game { ..g2 });

        // Emit events
        emit!(world, GameEvent::GameFinished { game_id, winner, final_turn: g.turn_no });
        emit!(world, GameEvent::EscrowSettled { game_id, winner, total_payout });
    }
}
```

**Deliverable:** Complete game flow from board commit to settlement

### 4.2 Client-Side State Management (Days 6-7)

**Step 1: Zustand Store Setup**

```typescript
// src/state/gameStore.ts
interface GameState {
  // Game data from Torii
  currentGame: Game | null;
  shots: Shot[];
  cellHits: CellHit[];
  shipAliveCount: ShipAliveCount[];

  // UI state
  selectedCell: [number, number] | null;
  gamePhase: "setup" | "playing" | "finished";
  isMyTurn: boolean;

  // Actions
  selectCell: (x: number, y: number) => void;
  fireShot: (x: number, y: number) => Promise<void>;
  commitBoard: (board: number[][], ships: Ship[]) => Promise<void>;
}
```

**Step 2: NoirJS Integration**

```typescript
// src/services/zkProving.ts
import { Noir } from "@noir-lang/noir_js";

export class ZKProver {
  private boardCommitNoir: Noir;
  private shotResultNoir: Noir;

  async proveBoardCommit(
    gameId: string,
    playerAddr: string,
    board: number[][],
    salt: string
  ) {
    // Match circuit signature: (game_id, player_addr, board, salt, ships)
    const input = {
      game_id: gameId,
      player_addr: playerAddr,
      board,
      salt,
      ships: STANDARD_FLEET,
    };
    const proof = await this.boardCommitNoir.generateProof(input);
    return proof;
  }

  async proveShotResult(
    gameId: string,
    defenderAddr: string,
    board: number[][],
    salt: string,
    rulesHash: string,
    x: number,
    y: number,
    secret: string
  ) {
    // Match circuit signature: (board, salt, game_id, defender_address, rules_hash, x, y, secret)
    const input = {
      board,
      salt,
      game_id: gameId,
      defender_address: defenderAddr,
      rules_hash: rulesHash,
      x,
      y,
      secret,
    };
    const proof = await this.shotResultNoir.generateProof(input);
    return proof;
  }
}
```

**Deliverable:** End-to-end proving flow in browser

---

## 5. Phase 4: UI & User Experience (Week 2)

### 5.1 Cartridge Controller Integration (Days 7-8)

**Step 1: Session Policy Setup**

```typescript
// src/services/controller.ts
import Controller from "@cartridge/controller";

// Split into two policies: Gameplay (gas-sponsored) and Funding (separate)
const gameplayPolicy = {
  contracts: {
    [DOJO_SYSTEM_ADDRESS]: {
      name: "Battleship Gameplay",
      description: "All in-game actions (gas-sponsored)",
      methods: [
        "commit_board",
        "fire_shot",
        "apply_shot_proof",
        "timeout",
        "timeout_flip",
        "cancel_unstarted",
        "resign",
      ],
      limits: {
        maxCallsPerHour: 200,
        maxValuePerTx: 0, // No value transfer in gameplay actions
      },
    },
  },
};

const fundingPolicy = {
  contracts: {
    [BATTLE_TOKEN_ADDRESS]: {
      name: "Battleship Funding",
      description: "Token approvals and staking",
      methods: ["approve"],
      limits: {
        maxCallsPerHour: 20,
        maxValuePerTx: 0, // ERC-20 operations don't transfer native value
      },
    },
    [DOJO_SYSTEM_ADDRESS]: {
      name: "Battleship Escrow",
      description: "Stake/bond and refund operations",
      methods: ["stake_and_bond", "settle_escrow", "refund_bond"],
      limits: {
        maxCallsPerHour: 20,
        maxValuePerTx: 0,
      },
    },
  },
};

// NOTE: Some Controller SDK versions expect maxValuePerTx as number/BigInt, not string
// Verify with your SDK version and adjust accordingly
// Paymaster may reject high limits on funding policy; keep separate for flexibility

export const controller = new Controller({
  appId: process.env.CONTROLLER_APP_ID,
  rpc: process.env.STARKNET_RPC_URL,
  policies: [gameplayPolicy, fundingPolicy],
});
```

**Step 2: Passkey Onboarding Flow**

```typescript
// src/components/ConnectWallet.tsx
const handleConnect = async () => {
  try {
    await controller.connect();
    // Automatically creates session with predefined policy
    // No signature prompts for gameplay actions
  } catch (error) {
    // Handle connection errors
  }
};
```

**Step 3: Gasless Transactions**

```typescript
// src/services/transactions.ts
export async function executeGameAction(action: string, params: any[]) {
  // Uses Controller's paymaster for gas sponsorship
  const tx = await controller.execute({
    contractAddress: DOJO_SYSTEM_ADDRESS,
    entrypoint: action,
    calldata: params,
  });

  return tx;
}

// Helper to encode u256 for Starknet (splits into low/high felts)
const toU256Calldata = (x: bigint): string[] => {
  const low = (x & ((1n << 128n) - 1n)).toString();
  const high = (x >> 128n).toString();
  return [low, high];
};

// Stake flow with ERC20 approval
export async function stakeTokens(amount: bigint, bond: bigint) {
  const total = amount + bond;

  // CRITICAL: Spender must be the Dojo systems contract (where stake_and_bond lives)
  // NOT a separate escrow contract - stake_and_bond calls transfer_from(caller, get_contract_address(), ...)
  // where get_contract_address() returns the systems contract itself
  const SYSTEMS_CONTRACT_ADDRESS = DOJO_SYSTEM_ADDRESS; // The contract that executes stake_and_bond

  // 1. Approve systems contract (u256 = [low, high])
  await controller.execute({
    contractAddress: BATTLE_TOKEN_ADDRESS,
    entrypoint: "approve",
    calldata: [SYSTEMS_CONTRACT_ADDRESS, ...toU256Calldata(total)],
  });

  // 2. Stake and bond (both amounts as u256)
  await executeGameAction("stake_and_bond", [
    BATTLE_TOKEN_ADDRESS,
    ...toU256Calldata(amount),
    ...toU256Calldata(bond),
  ]);
}
```

**Deliverable:** One-click connect with gasless gameplay

### 5.2 Enhanced UI Components (Days 8-9)

**Step 1: Interactive 3D Board**

```typescript
// src/components/GameBoard3D.tsx
- Animated ship placement during setup
- Click/hover effects for cell selection
- Hit/miss explosion animations
- Ship sinking animations
- Turn indicators and status overlays
```

**Step 2: Game Flow Components**

```typescript
// src/components/
- LobbyBrowser.tsx (create/join games)
- ShipPlacement.tsx (drag & drop ship setup)
- GameHUD.tsx (turn timer, ship status, actions)
- MetricsPanel.tsx (proving time, gas costs, latency)
- VictoryScreen.tsx (results & settlement)
```

**Step 3: Real-time Updates**

```typescript
// src/hooks/useGameSubscription.ts
export function useGameSubscription(gameId: string) {
  const [gameState, setGameState] = useState<GameState>();

  useEffect(() => {
    const subscription = toriiClient.subscribe({
      query: `
        subscription GameUpdates($gameId: String!) {
          shots(where: { game_id: $gameId }) { x, y, result, turn_no }
          cellHits(where: { game_id: $gameId }) { player, x, y, hit }
          shipAliveCount(where: { game_id: $gameId }) { player, remaining_hits }
          game(where: { id: $gameId }) { status, turn_player, winner }
        }
      `,
      variables: { gameId },
    });

    subscription.subscribe(setGameState);
    return () => subscription.unsubscribe();
  }, [gameId]);

  return gameState;
}
```

**Deliverable:** Polished game UI with real-time updates

---

## 6. Phase 5: Bitcoin Integration (Week 2)

### 6.1 Xverse Wallet Integration (Days 9-10)

**Step 1: Sats Connect Setup**

```typescript
// src/services/xverse.ts
import { connect, signMessage, signPsbt } from "sats-connect";

export class XverseService {
  async connectWallet() {
    const response = await connect({
      onFinish: (response) => {
        // Store BTC address only (Xverse doesn't provide Starknet addresses)
        const { addresses } = response;
        const btcAddress = addresses.find(
          (addr) => addr.purpose === "payment"
        )?.address;
      },
      onCancel: () => console.log("Connection cancelled"),
    });

    return response;
  }

  async bindIdentity(controller: Controller) {
    // Get Starknet address from Cartridge Controller
    const starknetAddress = await controller.getAddress();

    // Sign binding message with BTC key
    const message = `Bind BTC -> Starknet: ${starknetAddress}`;
    const signature = await signMessage({ message });

    // Submit binding to backend/on-chain registry
    return { starknetAddress, signature };
  }
}
```

**Step 2: Payment Flows**

```typescript
// On-chain BTC: build PSBT → sign → broadcast
async payWithBTC(amountSats: number, btcAddress: string) {
  const psbtBase64 = await this.buildPsbtBase64(amountSats, btcAddress); // or convert hex→base64
  const { psbtBase64: signedPsbt } = await signPsbt({ psbtBase64 });      // Xverse signs
  const txid = await this.broadcastPsbt(signedPsbt);                     // your backend / public relay
  return txid;
}

// Lightning: present invoice, deep-link to Xverse
async presentLightningInvoice(invoice: string, invoiceQRUrl: string) {
  // Show invoice and deep-link to Xverse mobile in-app browser for payment
  if (this.isMobile()) {
    window.location.href = `xverse://browser?url=${encodeURIComponent(invoiceQRUrl)}`;
  } else {
    this.showQRCode(invoice);  // For mobile wallet scan
  }
}
```

**Deliverable:** Working BTC wallet connection and payment flows

### 6.2 Atomiq Swap Integration (Days 10-11)

**Step 1: Swap Service**

```typescript
// src/services/atomiq.ts
// NOTE: API endpoints below are placeholders - use Atomiq's actual documented API
// Wire to documented flow: quote → binding price → SPV/HTLC → Garden minting
export class AtomiqService {
  private baseUrl = process.env.ATOMIQ_API_BASE;

  async createDepositQuote(amount: number, starknetAddress: string) {
    const response = await fetch(`${this.baseUrl}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        source_currency: "BTC",
        dest_chain: "starknet",
        dest_address: starknetAddress,
        dest_currency: "STRK", // or wrapped BTC
      }),
    });

    const quote = await response.json();
    return {
      swapId: quote.id,
      btcAddress: quote.btc_address,
      lightningInvoice: quote.lightning_invoice,
      rate: quote.rate,
      expiry: quote.expiry,
    };
  }

  async checkSwapStatus(swapId: string) {
    const response = await fetch(`${this.baseUrl}/status/${swapId}`);
    const status = await response.json();
    return status; // pending | confirmed | minted | failed
  }

  async createWithdrawQuote(amount: number, btcAddress: string) {
    // Reverse swap: Starknet → BTC
    const response = await fetch(`${this.baseUrl}/withdraw-quote`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        source_chain: "starknet",
        dest_currency: "BTC",
        dest_address: btcAddress,
      }),
    });

    return await response.json();
  }
}
```

**Step 2: Deposit Flow Integration**

```typescript
// src/components/DepositFlow.tsx
const handleBTCDeposit = async (amount: number) => {
  // 1. Get quote from Atomiq
  const quote = await atomiqService.createDepositQuote(amount, starknetAddress);

  // 2. Show payment options to user
  const paymentMethod = await showPaymentModal(quote);

  // 3. Execute payment via Xverse
  let txid;
  if (paymentMethod === "lightning") {
    // Build QR code URL for invoice
    const invoiceQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      quote.lightningInvoice
    )}`;
    await xverseService.presentLightningInvoice(
      quote.lightningInvoice,
      invoiceQRUrl
    );
    // Lightning payments don't return immediate txid
    txid = null;
  } else {
    // Convert to satoshis for Xverse
    const amountSats = Math.round(amount * 1e8);
    txid = await xverseService.payWithBTC(amountSats, quote.btcAddress);
  }

  // 4. Poll swap status until completion
  const pollStatus = setInterval(async () => {
    const status = await atomiqService.checkSwapStatus(quote.swapId);
    if (status.state === "minted") {
      clearInterval(pollStatus);
      showSuccessNotification("Funds available for gameplay!");
      refreshBalance();
    } else if (status.state === "pending") {
      // Surface "awaiting swap" state for clear UX
      showSwapPendingState(status);
    }
  }, 5000);
};
```

**Deliverable:** End-to-end BTC deposit and withdrawal flows

---

## 7. Phase 6: Testing & Polish (Week 2)

### 7.1 Comprehensive Testing (Days 11-12)

**Step 1: Unit Tests**

```bash
# ZK circuits
cd zk/circuits/board_commit && nargo test
cd ../shot_result && nargo test

# Cairo systems
cd chain/dojo && sozo test

# Client components
cd apps/client && pnpm test
```

**Step 2: Integration Tests**

```typescript
// tests/integration/gameplay.test.ts
describe("Complete Game Flow", () => {
  test("board commit → shots → settlement", async () => {
    // Setup two players
    // Commit boards with ZK proofs
    // Exchange shots with proofs
    // Verify settlement
  });

  test("timeout and bond slashing", async () => {
    // Setup game
    // One player goes offline
    // Other player calls timeout
    // Verify bond slashed and game awarded
  });

  test("pending shot must exist before apply_shot_proof", async () => {
    // Setup game with committed boards
    // Attempt to call apply_shot_proof without fire_shot
    // Expect STALE_PENDING_SHOT error
  });

  test("nullifier replay protection", async () => {
    // Setup game, fire shot
    // Defender provides valid proof with nullifier N
    // Attempt to provide second proof with same nullifier N
    // Expect REPLAY error
  });

  test("duplicate commit prevention", async () => {
    // Player commits board
    // Same player attempts second commit
    // Expect ALREADY_COMMITTED error
  });

  test("cross-game commitment reuse fails", async () => {
    // Player commits board in game A
    // Attempt to reuse same commitment in game B
    // Expect proof verification to fail due to domain separation
  });

  test("pending shot uniqueness per turn", async () => {
    // Attacker fires shot at (3, 4)
    // Attacker attempts to fire second shot at (5, 6) in same turn
    // Expect ALREADY_PENDING error
  });

  test("escrow path: stake → play → settle transfers tokens", async () => {
    // Both players approve and stake tokens
    // Verify balances moved into escrow
    // Complete game
    // Verify winner receives total stakes
  });

  test("deterministic sinking detects win", async () => {
    // Setup game with known board
    // Hit all 17 ship cells
    // Verify game status changes to Finished
    // Verify winner set correctly
    // Verify escrow auto-settled
  });

  test("winner is pre-flip attacker (regression guard)", async () => {
    // Setup game, record current turn_player (attacker)
    // Defender provides proof for final hit
    // CRITICAL: Verify winner == pre-flip attacker, NOT the flipped turn_player
    // This catches the bug where win check happens after turn flip
  });

  test("finalize_win with no escrow does not revert", async () => {
    // Create game without funding
    // Manually trigger win condition
    // Verify GameFinished emitted but no EscrowSettled (or EscrowSettled with 0 payout)
    // Ensures unfunded games can complete
  });

  test("ERC-20 approve spender is systems contract", async () => {
    // Build approve tx with SYSTEMS_CONTRACT_ADDRESS as spender
    // Verify it matches the contract address where stake_and_bond executes
    // Call stake_and_bond
    // Verify transfer_from succeeds (would fail if spender mismatch)
  });

  test("world dispatcher pass-through compiles", async () => {
    // Simple compilation guard
    // Call apply_hit_and_check_win(world, ...) from a system
    // Call finalize_win(world, ...) from a system
    // Ensures world parameter doesn't get accidentally removed
  });
});
```

**Step 3: E2E Tests**

```typescript
// tests/e2e/btc-flow.test.ts
describe("Bitcoin Integration", () => {
  test("BTC deposit → play → withdraw", async () => {
    // Connect Xverse (testnet)
    // Deposit via Lightning/on-chain
    // Play complete game
    // Withdraw winnings to BTC
  });
});
```

**Step 4: Poseidon Cross-Testing**

```typescript
// Critical: Verify Poseidon alignment between Noir and Cairo
// Hash same input in NoirJS and Cairo, ensure results match
test("Poseidon hash alignment", () => {
  const input = [game_id, defender_addr, x, y, secret];
  const noirHash = noirjs.poseidon(input); // via noir_js
  const cairoHash = cairoContract.poseidon(input); // via Cairo contract
  expect(noirHash).toEqual(cairoHash);
});

// Additional test for board commitment hash consistency
test("Board commitment hash consistency", () => {
  const board = [
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0] /* ... */,
  ];
  const salt = "0x123456789";

  const boardCommitHash = boardCommitCircuit.poseidon_hash_board_with_salt(
    board,
    salt
  );
  const shotResultHash = shotResultCircuit.poseidon_hash_board_with_salt(
    board,
    salt
  );

  expect(boardCommitHash).toEqual(shotResultHash);
});

// Regression test: verifier public input order using golden test vector
test("Verifier public input order regression guard", () => {
  // Keep a golden test vector: fixed public inputs + expected encoding
  // This catches accidental reordering when regenerating Garaga verifiers
  const goldenPublicInputs = {
    commitment: "0x123...",
    rules_hash: "0x456...",
    game_id: "0x789...",
    defender_address: "0xabc...",
    x: 5,
    y: 3,
    result: 1,
    nullifier: "0xdef...",
  };

  // Expected serialized array based on contract's encoding
  const expectedSerialized = [
    goldenPublicInputs.commitment,
    goldenPublicInputs.rules_hash,
    goldenPublicInputs.game_id,
    goldenPublicInputs.defender_address,
    goldenPublicInputs.x.toString(),
    goldenPublicInputs.y.toString(),
    goldenPublicInputs.result.toString(),
    goldenPublicInputs.nullifier,
  ];

  const actualSerialized = serializePublicInputs(goldenPublicInputs);
  expect(actualSerialized).toEqual(expectedSerialized);
});

// RECOMMENDED: Store golden test vectors in /zk/golden/ directory
// - golden_shot_result.json: fixed inputs + expected public output array
// - Load in tests to guard against Garaga regeneration drift
```

**Deliverable:** Test suite with >90% coverage + hash function verification

### 7.2 Performance & Metrics (Days 12-13)

**Step 1: Proving Performance**

```typescript
// src/components/MetricsPanel.tsx
const MetricsPanel = () => {
  const [metrics, setMetrics] = useState({
    proveTime: 0,
    proofSize: 0,
    verifyGas: 0,
    turnLatency: 0,
    sessionCoverage: 0,
    swapTimes: [],
  });

  // Track and display real-time metrics
  // Board commit prove time
  // Shot proof generation time
  // On-chain verification gas costs
  // End-to-end turn latency
  // Session policy coverage (% auto-approved)
  // BTC swap settlement times
};
```

**Step 2: Optimization**

```typescript
// Optimize circuit constraints
// Precompute witness generation
// Use Web Workers for proving
// Optimize bundle size
// Implement progressive loading
```

**Step 3: Success Criteria Validation**

```typescript
// Automated checks for PRD success criteria:
// < 60s from landing → first shot
// > 90% turns auto-approved via sessions
// Proof verify gas ≤ target
// Average turn latency under target
// BTC-in → play → BTC-out working end-to-end
```

**Deliverable:** Optimized app meeting all performance targets

### 7.3 Documentation & Demo (Days 13-14)

**Step 1: Technical Documentation**

```markdown
// docs/ARCHITECTURE.md - system design
// docs/API.md - contract interfaces
// docs/CIRCUITS.md - ZK proof specifications
// CRITICAL REQUIREMENTS:
// 1. Constants (must match constants.cairo):
// - BSCM_TAG = 0x4253434D ("BSCM" - Board Commitment)
// - BSHOT_TAG = 0x42534854 ("BSHT" - Shot Nullifier)
// - COIN_TAG = 0x434F494E ("COIN" - Coin-flip Commitment)
// - TOTAL_SHIP_CELLS = 17 (standard fleet)
// - TIMEOUT_DURATION = 120 (2 minutes)
// - START_REVEAL_DEADLINE = 300 (5 minutes)
// 2. BoardCommit domain separation: [BSCM_TAG, game_id, player_addr]
// 3. ShotResult nullifier: poseidon([BSHOT_TAG, game_id, defender, x, y, secret])
// 4. Coin-flip: pedersen(pedersen(COIN_TAG, game_id), pedersen(player_felt, nonce))
// 5. ShotResult public output order (NEVER CHANGE):
// (commitment, rules_hash, game_id, defender_address, x, y, result, nullifier)
// 6. BN254 curve requirement for Garaga compatibility
// 7. Poseidon parameters must match between Noir and Cairo
// 8. Add regression test that fails if verifier signature changes
// 9. Board size hardcoded to 10×10 in circuits
// docs/DEPLOYMENT.md - production setup guide
```

**Step 2: User Guides**

```markdown
// docs/USER_GUIDE.md

- How to connect wallets
- How to deposit/withdraw BTC
- Game rules and controls
- Troubleshooting common issues
```

**Step 3: Demo Video**

- Complete user journey walkthrough
- Technical deep-dive for judges
- Sponsor technology showcases
- Performance metrics demonstration

**Deliverable:** Complete documentation and demo materials

### 7.5 Production Sanity Checklist

**Critical Implementation Checks:**

- [ ] `BoardCommit` and `ShotResult` both use domain-separated Poseidon (BN254) with identical preimage layout
- [ ] Domain separation tags: `BSCM_TAG=0x4253434D` for board, `BSHOT_TAG=0x42534854` for nullifier
- [ ] Verifier inputs order matches circuit publics exactly: (commitment, rules_hash, game_id, defender, x, y, result, nullifier)
- [ ] Regression test that fails if verifier signature changes
- [ ] `NullifierSet` checked **before** writing `Shot` to avoid partial state on failure
- [ ] `PendingShot` model has ONLY `(game_id, turn_no)` as keys; `shooter, x, y` are non-key fields
- [ ] `PendingShot` guard keys on only `(game_id, turn_no)` to block multiple pending shots per turn
- [ ] `PendingShot` fetched by keys only in `apply_shot_proof`, then validate shooter and coordinates
- [ ] `PendingShot` removed with `delete!(world, PendingShot { game_id, turn_no })` using only key fields
- [ ] `PendingShot` must exist before `apply_shot_proof` (test coverage for this)
- [ ] `Game.rules_hash` locked on first commit; second commit must match
- [ ] Each player can commit board only once (check uses only key fields: `game_id, player`)
- [ ] `fire_shot` includes `game_id` parameter and validates: turn player, bounds, no duplicate pending
- [ ] All `assert()` replaced with `errors::require()` for Cairo 1 compatibility
- [ ] Timestamp uses `starknet::get_block_timestamp().into()`
- [ ] `TIMEOUT_DURATION` constant defined (e.g., 120 seconds) and surfaced in UI
- [ ] Session policy separated for **Funding** (ERC20 approve/stake) if paymaster rejects high limits
- [ ] Xverse PSBT passed to `signPsbt({ psbtBase64 })` is **base64**, not hex
- [ ] Integration test asserts Poseidon parity (NoirJS vs Cairo)
- [ ] Turn flip uses local `defender` variable, not recomputed
- [ ] Turn number off-by-one eliminated (single source of truth: `g.turn_no`)
- [ ] ContractAddress to felt252 conversion uses `contract_address_to_felt252()` helper
- [ ] Deterministic sinking logic implemented (no TODO)
- [ ] Duplicate shot guard uses `get_opt()` function pattern, never deletes `AttackerShot`
- [ ] Escrow uses `transfer_from()` to pull funds IN on stake (caller must approve first)
- [ ] Escrow settlement uses `transfer()` to send funds OUT to winner
- [ ] `transfer_token()` helper takes only `(token, to, amount)` - no unused `from` parameter
- [ ] All model fields have explicit Cairo types (`u32` for `turn_no`, `u64` for `last_action`, `felt252` for hashes)
- [ ] Poseidon input packing documented in `CIRCUITS.md` with all domain tags
- [ ] Version pinning documented in `TOOLING.md` (Noir, Garaga, Dojo versions)
- [ ] Win detection happens BEFORE turn flip (via `apply_hit_and_check_win()`) to award correct attacker
- [ ] `finalize_win()` called with pre-flip attacker address, not post-flip turn_player
- [ ] Helper functions all take `world: IWorldDispatcher` as first parameter: `get_attacker_address()`, `get_defender_address()`, `get_opponent()`, `get_game_rules_hash()`, `expected_offender()`
- [ ] All helper call sites pass `world` parameter (5 helpers × multiple call sites)
- [ ] `GameStatus` enum defined with values: Created(0), Started(1), Finished(2), Cancelled(3)
- [ ] `Game.status` field type is `GameStatus` enum, not `u8`
- [ ] Constants centralized: `BSCM_TAG`, `BSHOT_TAG`, `COIN_TAG`, `TOTAL_SHIP_CELLS`, `TIMEOUT_DURATION`, `START_REVEAL_DEADLINE`, `CANCEL_GRACE`
- [ ] Circuit constants synced with Cairo constants (documented with NOTE comments)
- [ ] `last_action` assignment uses `starknet::get_block_timestamp()` directly
- [ ] Turn rule documented: turns always alternate, no extra shot on hit
- [ ] Timeout checks correct offender: defender if pending shot exists, else attacker (via `expected_offender()`)
- [ ] Timeout parameters: derive offender automatically, don't take as parameter
- [ ] Bonds refunded on normal win to both players (not just winner)
- [ ] Coin-flip uses domain-separated hash: `coin_commit(game_id, player, nonce)` with Pedersen
- [ ] Coin-flip guards: `ALREADY_COMMITTED_FLIP`, `ALREADY_REVEALED_FLIP`
- [ ] Coin-flip deadline: `start_deadline` set when both commit, enforced in reveal
- [ ] `Game.start_deadline` field added (u64)
- [ ] Escrow enforces single token: `TOKEN_MISMATCH` if players use different tokens
- [ ] `commit_board` guards: `NOT_PLAYER`, `ALREADY_STARTED`, `GAME_FINISHED`, `BAD_BOARD_SIZE` (must be 10×10)
- [ ] `create_game` enforces 10×10 board size and imports `pedersen` for game ID generation
- [ ] `create_game` emits `GameCreated` event
- [ ] `fire_shot` updates `last_action` to start defender's timer
- [ ] `fire_shot` guards: `NOT_STARTED`, `BOARDS_NOT_COMMITTED`, `NOT_YOUR_TURN`, `OUT_OF_BOUNDS`
- [ ] `fire_shot` emits `ShotFired` event
- [ ] Coin-flip reveal requires both commits before any reveal: `COMMITS_NOT_COMPLETE` guard
- [ ] Nullifier replay check uses `get_opt()` (handles unlikely Poseidon output == 0)
- [ ] Turn numbers consistent: Shot written at current turn, then Game.turn_no incremented
- [ ] Flip timeout `timeout_flip()` implemented: slashes non-revealer, starts game with revealer first
- [ ] Flip timeout validates: both commits exist, exactly one reveal (XOR), deadline passed
- [ ] Flip timeout requires boards committed before starting game
- [ ] Flip timeout guards against missing escrow (uses get_opt_escrow)
- [ ] In-match timeout guards against missing escrow (uses get_opt_escrow)
- [ ] Timeout paths emit `GameFinished` and `EscrowSettled` events
- [ ] Reveal phase requires boards committed before setting game to Started
- [ ] `get_opt_*()` functions use sentinel field checks for each model (9 helpers total)
- [ ] ContractAddress sentinel checks use `contract_address_to_felt252()` for comparison (not direct `!= 0`)
- [ ] `get_opt_start_reveal()` sentinels on `player` field, not `nonce` (0 is valid nonce)
- [ ] `errors::require()` uses `ArrayTrait` for panic payload (Cairo 1 compatible)
- [ ] `create_game()` uses proper zero ContractAddress: `0.try_into().expect('ZERO_CA')`
- [ ] Zero nullifier blocked: `errors::require(nullifier != 0, 'BAD_NULLIFIER')` in apply_shot_proof
- [ ] Double funding prevented: `ALREADY_FUNDED` guard checks both stake and bond are zero
- [ ] Event emissions use variant-qualified syntax: `emit!(world, GameEvent::EventName { ... })`
- [ ] Rules hash guard explicit: `g2.rules_hash == 0 || g2.rules_hash == rules_hash`
- [ ] `get_opt_cell_hit()` and `get_opt_ship_alive_count()` added for deterministic sinking
- [ ] `cancel_unstarted()` has grace period: no commits, OR one commit + CANCEL_GRACE, OR reveal deadline passed
- [ ] `resign()` implemented: forfeits to opponent, uses finalize_win for proper settlement
- [ ] `AttackerShot` security documented: never deleted to prevent re-targeting
- [ ] Events defined: GameCreated, ShotFired, ShotResolved, GameFinished, EscrowSettled, GameCancelled
- [ ] Events emitted at all key points: create_game, fire_shot, apply_shot_proof, finalize_win
- [ ] `create_game` returns game_id and emits GameCreated
- [ ] `apply_shot_proof` guards: `NOT_STARTED` to prevent flip-timeout edge cases
- [ ] `apply_shot_proof` emits `ShotResolved` event
- [ ] `last_action` updated at phase transitions: create, both boards ready, both reveals complete, shot fired, proof applied
- [ ] Controller policies split: Gameplay (gas-sponsored, all game methods) and Funding (approve, stake, settle)
- [ ] Gameplay policy includes: commit_board, fire_shot, apply_shot_proof, timeout, timeout_flip, cancel_unstarted, resign
- [ ] Funding policy includes: ERC-20 approve, stake_and_bond, settle_escrow, refund_bond
- [ ] Client u256 encoding: `toU256Calldata()` splits BigInt to [low, high] for ERC-20 approve and stake amounts
- [ ] Golden test vectors stored in `/zk/golden/` directory for verifier regression testing
- [ ] Client `proveBoardCommit()` includes `gameId` and `playerAddr` to match circuit signature
- [ ] Client `proveShotResult()` includes `gameId`, `defenderAddr`, and `rulesHash` to match circuit signature
- [ ] Helper functions `apply_hit_and_check_win()` and `finalize_win()` take `world: IWorldDispatcher` parameter
- [ ] All call sites pass `world` to helpers (2 calls in apply_shot_proof, 1 in resign)
- [ ] `finalize_win()` guards against missing escrow (uses get_opt_escrow)
- [ ] Timeout paths guard against missing escrow (no-op if not funded)
- [ ] Timeout paths emit events consistently with normal win path
- [ ] Both reveal paths require boards committed before starting game (start_game_reveal and timeout_flip)
- [ ] `apply_shot_proof` uses model-specific get_opt helpers (not generic)
- [ ] ERC-20 approve spender is SYSTEMS_CONTRACT_ADDRESS (where stake_and_bond executes)
- [ ] Client comment clarifies approve spender must match get_contract_address() in stake_and_bond
- [ ] Repository structure includes `/zk/golden/` for test vectors, not unused `sunk_check`
- [ ] Test coverage includes all critical paths: nullifier replay, duplicate commit, pending shot requirement, cross-game commitment reuse, pending shot uniqueness, escrow token flow, deterministic win detection, winner is pre-flip attacker, bond refunds on win, finalize_win with no escrow, ERC-20 spender validation, world dispatcher pass-through
- [ ] Events enhanced: `BoardsReady` when both boards committed, `GameFinished` includes `final_turn` for analytics
- [ ] `BoardsReady` event emitted in `commit_board` when second board lands
- [ ] Models include `CellHit`, `ShipAliveCount`, `StartCommit`, `StartReveal`; `ShipStatus` removed (unused)
- [ ] All free helper functions compile correctly with `world: IWorldDispatcher` parameter threading

---

## 8. Deployment & Production

### 8.1 Testnet Deployment

**Step 1: Deploy Dojo World**

```bash
# Configure for Starknet testnet
export STARKNET_RPC_URL="https://starknet-sepolia.public.blastapi.io"
export WORLD_ADDRESS="0x..."

cd chain/dojo
sozo build --release
sozo migrate --world $WORLD_ADDRESS
```

**Step 2: Deploy Client**

```bash
cd apps/client
pnpm build
# Deploy to Vercel/Netlify with environment variables
```

**Step 3: Configure Services**

```bash
# Submit Cartridge session policy for Verified Sessions (early submission)
# Configure Atomiq testnet endpoints
# Setup monitoring and analytics
```

### 8.2 Production Checklist

- [ ] Security audit of ZK circuits
- [ ] Cairo contract verification on Starkscan
- [ ] Session policy approved by Cartridge for Verified Sessions (one-tap connect)
- [ ] BTC testnet → mainnet migration plan
- [ ] Performance monitoring setup
- [ ] Error tracking and logging
- [ ] Backup and recovery procedures

---

## 9. Risk Mitigation

### 9.1 Technical Risks

**Browser Proving Performance**

- _Risk:_ ZK proving too slow in browser
- _Mitigation:_ Web Workers, circuit optimization, precomputation

**Verifier Backend Mismatch**

- _Risk:_ Noir→Garaga conversion issues
- _Mitigation:_ Use Garaga-supported curves (BN254), test early

**Swap Settlement Delays**

- _Risk:_ BTC swaps take too long
- _Mitigation:_ Lightning preference, clear UI states, timeouts

### 9.2 Integration Risks

**Session Policy Rejection**

- _Risk:_ Cartridge rejects session policy
- _Mitigation:_ Follow best practices, submit early for review

**API Changes**

- _Risk:_ External service API changes
- _Mitigation:_ Version pin dependencies, fallback providers

---

## 10. Success Metrics

### 10.1 Hackathon Criteria

- [ ] < 60s from landing → first shot (new user)
- [ ] > 90% turns auto-approved via sessions
- [ ] Proof verify gas ≤ documented target
- [ ] Average turn latency under target
- [ ] BTC-in → play → BTC-out demo working
- [ ] Clear sponsor alignment demonstrated

### 10.2 Technical KPIs

- [ ] BoardCommit proof time < 5s
- [ ] ShotResult proof time < 2s
- [ ] On-chain verification < 100k gas per proof
- [ ] Lightning deposits confirmed < 30s
- [ ] Zero session signature prompts during normal gameplay
- [ ] 99.9% uptime during demo period

---

## Development Timeline Summary

| Week | Days  | Focus               | Key Deliverables                        |
| ---- | ----- | ------------------- | --------------------------------------- |
| 1    | 1-2   | Dojo + Basic Client | Local dev environment, basic game flow  |
| 1    | 3-5   | ZK Circuits         | Working Noir circuits with tests        |
| 1    | 5-6   | Garaga Integration  | On-chain proof verification             |
| 1-2  | 6-7   | Game Logic          | Complete gameplay with state management |
| 2    | 7-9   | UI/UX + Controller  | Polished UI with gasless sessions       |
| 2    | 9-11  | Bitcoin Integration | BTC deposit/withdraw flows              |
| 2    | 11-14 | Testing + Polish    | Production-ready with docs              |

**Total estimated effort:** 2 weeks with 2-3 developers working in parallel on different components.

---

## Quick Start: Day-1 Boot Sequence

**Copy/paste sequence to get from zero to first shot:**

```bash
# 0) Repository setup
git init && git branch -m main
pnpm -v || (npm i -g pnpm)

# 1) Tooling pin documentation
mkdir -p docs && printf "# Tooling Versions\n\nSee IMPLEMENTATION_PLAN.md section 1.1\n" > docs/TOOLING.md

# 2) Chain: Dojo world
cd chain/dojo
sozo build

# Terminal A: Start Katana (dev network)
katana --dev &

# Terminal B: Migrate contracts
sleep 2
sozo migrate
export WORLD_ADDR=<addr_from_migrate>

# Terminal C: Start Torii (indexer)
torii --world $WORLD_ADDR --database-url sqlite://torii.db &

# 3) Client: Web app
cd ../../apps/client
pnpm install
pnpm dev &

# 4) Quick smoke test (using two local accounts)
# Account 1: Create game
sozo execute create_game <p2_address> 10

# Account 1 & 2: Commit boards (after generating ZK proofs)
sozo execute commit_board <game_id> <commitment> <rules_hash> <proof>

# Wait for BoardsReady event (both boards committed)

# Account 1 & 2: Coin-flip commit-reveal
sozo execute start_game_commit <game_id> <commit_hash>
sozo execute start_game_reveal <game_id> <nonce>

# Game starts! Fire shots and exchange proofs
sozo execute fire_shot <game_id> <x> <y>
sozo execute apply_shot_proof <game_id> <x> <y> <result> <nullifier> <rules_hash> <proof>

# Confirm:
# - ShotFired event
# - ShotResolved event
# - Turn flips
# - GameFinished when 17 hits land
```

**Scope priorities if time-constrained:**

- ✅ **Must-have**: On-chain proof verification, turn-based gameplay, basic escrow
- 🎯 **Should-have**: Cartridge sessions, Xverse wallet, on-chain BTC payments
- 🌟 **Nice-to-have**: Three.js animations, Lightning support, tournament mode

**Build order for speed:**

1. Core Dojo world + mock token (Day 1-2)
2. ZK circuits + Garaga verifiers (Day 3-5)
3. Basic 2D client + NoirJS browser proving (Day 6-7)
4. Cartridge Controller + gasless UX (Day 8)
5. Xverse + Atomiq BTC rails (Day 9-10)
6. Polish, testing, demo (Day 11-14)

---

This implementation plan provides a comprehensive roadmap for building the ZK Battleship game according to the PRD specifications. Each phase builds incrementally toward the final product while allowing for parallel development across different components.
