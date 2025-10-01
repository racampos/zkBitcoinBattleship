# Dojo 1.7.0 Migration Guide

> **Important:** The IMPLEMENTATION_PLAN.md was written for Dojo 0.7.x. This guide shows how to translate the patterns to Dojo 1.7.0 syntax. **All the security logic remains 100% valid** - only the syntax changes.

## Key Syntax Differences

### Models

**Old (0.7.x):**
```cairo
#[derive(Copy, Drop, Serde, PartialEq)]
enum GameStatus {
    Created: u8 = 0,
    Started: u8 = 1,
}

struct Game {
    #[key] id: felt252,
    status: GameStatus,
    ...
}
```

**New (1.7.0):**
```cairo
// Enums can't be stored directly - use u8 constants
pub mod GameStatus {
    pub const Created: u8 = 0;
    pub const Started: u8 = 1;
    pub const Finished: u8 = 2;
    pub const Cancelled: u8 = 3;
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]  // Required attribute
pub struct Game {
    #[key]
    pub id: felt252,
    pub status: u8,  // Use u8, not enum
    // All models need at least one non-key field
}
```

### Systems

**Old (0.7.x):**
```cairo
#[system]
impl IFireShot {
    fn fire_shot(game_id: felt252, x: u8, y: u8) {
        let g = get!(world, Game { id: game_id });
        set!(world, Game { ..g });
        delete!(world, PendingShot { ... });
    }
}
```

**New (1.7.0):**
```cairo
#[starknet::interface]
pub trait IFireShot<T> {
    fn fire_shot(ref self: T, game_id: felt252, x: u8, y: u8);
}

#[dojo::contract]
pub mod fire_shot {
    use super::IFireShot;
    use dojo::model::ModelStorage;
    use starknet::get_caller_address;
    use crate::Game;
    
    #[abi(embed_v0)]
    impl FireShotImpl of IFireShot<ContractState> {
        fn fire_shot(ref self: ContractState, game_id: felt252, x: u8, y: u8) {
            let mut world = self.world_default();
            
            // Read model
            let mut g: Game = world.read_model(game_id);
            
            // Modify
            g.last_action = get_block_timestamp();
            
            // Write back
            world.write_model(@g);
            
            // Delete model
            let pending = PendingShot { game_id, turn_no: g.turn_no, ...default };
            world.erase_model(@pending);
        }
    }
    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")  // Your namespace
        }
    }
}
```

### Helper Functions

**Old (0.7.x):**
```cairo
fn get_attacker_address(game_id: felt252) -> ContractAddress {
    let g = get!(world, Game { id: game_id });
    g.turn_player
}
```

**New (1.7.0):**
```cairo
// Helper functions can't access world implicitly - must pass WorldStorage
use dojo::world::WorldStorage;

pub fn get_attacker_address(world: WorldStorage, game_id: felt252) -> ContractAddress {
    let g: Game = world.read_model(game_id);
    g.turn_player
}

// Call from system:
let attacker = get_attacker_address(world, game_id);
```

### Optional Model Getters

**Concept:** Check if a model exists before reading.

**Old (0.7.x):**
```cairo
fn get_opt<T>(world: IWorldDispatcher, entity: T) -> Option<T> {
    let data = get!(world, entity);
    if is_default(data) { Option::None } else { Option::Some(data) }
}
```

**New (1.7.0):**
```cairo
use dojo::world::WorldStorage;

// Model-specific helpers using sentinel field checks
pub fn get_opt_board_commit(
    world: WorldStorage, 
    game_id: felt252, 
    player: ContractAddress
) -> Option<BoardCommit> {
    let rec: BoardCommit = world.read_model((game_id, player));
    if rec.commitment != 0 { 
        Option::Some(rec) 
    } else { 
        Option::None 
    }
}

// For ContractAddress fields, convert first:
pub fn get_opt_pending_shot(
    world: WorldStorage,
    game_id: felt252, 
    turn_no: u32
) -> Option<PendingShot> {
    let rec: PendingShot = world.read_model((game_id, turn_no));
    if rec.shooter.into() != 0 { // ContractAddress to felt252
        Option::Some(rec) 
    } else { 
        Option::None 
    }
}
```

### Hash Functions

**Old (0.7.x):**
```cairo
use starknet::hash::pedersen::pedersen;

let hash = pedersen(a, b);
```

**New (1.7.0):**
```cairo
use core::poseidon::poseidon_hash_span;

// Poseidon is now the standard
let mut input = array![a, b, c];
let hash = poseidon_hash_span(input.span());
```

### Errors

**Old (0.7.x):**
```cairo
assert(condition, 'ERROR_CODE');
```

**New (1.7.0):**
```cairo
// Custom require helper
pub fn require(cond: bool, code: felt252) {
    if !cond {
        core::panic_with_felt252(code);
    }
}

// Usage:
errors::require(condition, 'ERROR_CODE');
```

### Events

**Old (0.7.x):**
```cairo
emit!(world, GameCreated { game_id, p1, p2 });
```

**New (1.7.0):**
```cairo
// Define events in the contract module
#[dojo::contract]
pub mod game_management {
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        GameCreated: GameCreated,
    }
    
    #[derive(Drop, starknet::Event)]
    pub struct GameCreated {
        pub game_id: felt252,
        pub p1: ContractAddress,
        pub p2: ContractAddress,
    }
    
    // Emit:
    self.emit(Event::GameCreated(GameCreated { game_id, p1, p2 }));
}
```

## Common Patterns Translation

### Reading a Model

```cairo
// Old:
let g = get!(world, Game { id: game_id });

// New:
let g: Game = world.read_model(game_id);
```

### Writing a Model

```cairo
// Old:
set!(world, Game { id: game_id, status: GameStatus::Started, ..g });

// New:
let mut g: Game = world.read_model(game_id);
g.status = GameStatus::Started;
world.write_model(@g);
```

### Deleting a Model

```cairo
// Old:
delete!(world, PendingShot { game_id, turn_no });

// New:
let pending = PendingShot { 
    game_id, 
    turn_no,
    shooter: 0.try_into().unwrap(), // Fill required fields with defaults
    x: 0,
    y: 0,
};
world.erase_model(@pending);
```

### Composite Keys

```cairo
// For models with multiple keys like BoardCommit:
let bc: BoardCommit = world.read_model((game_id, player));
```

## Implementation Strategy

When implementing systems from IMPLEMENTATION_PLAN.md:

1. **Keep all the security logic** (guards, checks, order of operations)
2. **Translate syntax** using this guide
3. **Add proper traits** (`Copy, Drop, Serde`)
4. **Use `pub` for visibility**
5. **Pass `WorldStorage` to helpers**
6. **Use sentinel checks for optional getters**

## Example: Complete System Translation

**From IMPLEMENTATION_PLAN.md (0.7.x):**
```cairo
#[system]
impl IFireShot {
    fn fire_shot(game_id: felt252, x: u8, y: u8) {
        let mut g = get!(world, Game { id: game_id });
        errors::require(g.status == GameStatus::Started, 'NOT_STARTED');
        
        let pending = get_opt_pending_shot(world, game_id, g.turn_no);
        errors::require(pending.is_none(), 'ALREADY_PENDING');
        
        set!(world, PendingShot { game_id, turn_no: g.turn_no, shooter: get_caller_address(), x, y });
        g.last_action = starknet::get_block_timestamp();
        set!(world, Game { ..g });
    }
}
```

**Translated to 1.7.0:**
```cairo
use starknet::ContractAddress;

#[starknet::interface]
pub trait IFireShot<T> {
    fn fire_shot(ref self: T, game_id: felt252, x: u8, y: u8);
}

#[dojo::contract]
pub mod fire_shot {
    use super::IFireShot;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, PendingShot, GameStatus};
    use crate::helpers::{errors, get_opt};
    
    #[abi(embed_v0)]
    impl FireShotImpl of IFireShot<ContractState> {
        fn fire_shot(ref self: ContractState, game_id: felt252, x: u8, y: u8) {
            let mut world = self.world_default();
            
            // Read game
            let mut g: Game = world.read_model(game_id);
            errors::require(g.status == GameStatus::Started, 'NOT_STARTED');
            
            // Check for pending shot
            let pending = get_opt::get_opt_pending_shot(world, game_id, g.turn_no);
            errors::require(pending.is_none(), 'ALREADY_PENDING');
            
            // Create pending shot
            let pending_shot = PendingShot {
                game_id,
                turn_no: g.turn_no,
                shooter: get_caller_address(),
                x,
                y,
            };
            world.write_model(@pending_shot);
            
            // Update game
            g.last_action = get_block_timestamp();
            world.write_model(@g);
        }
    }
    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}
```

## Next Steps

As we implement each system, we'll:
1. Reference the IMPLEMENTATION_PLAN.md for the security logic
2. Translate to Dojo 1.7.0 syntax using this guide
3. Update this migration guide with any new patterns discovered

The IMPLEMENTATION_PLAN.md remains valuable for:
- Security patterns and guards
- Helper function logic
- Game flow and state transitions
- Production checklist (110+ items)
- All non-syntax aspects

Think of IMPLEMENTATION_PLAN.md as the "what to do" and this guide as the "how to write it in 1.7.0".
