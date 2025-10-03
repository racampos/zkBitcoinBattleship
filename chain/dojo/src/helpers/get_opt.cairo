// get_opt.cairo - Model-specific optional getters using sentinel field checks
// These functions check if a model exists by testing non-zero sentinel fields

use starknet::ContractAddress;
use dojo::world::WorldStorage;
use dojo::model::ModelStorage;
use crate::{
    Game, BoardCommit, PendingShot, AttackerShot, Shot, NullifierSet,
    StartCommit, StartReveal, Escrow, CellHit, ShipAliveCount
};

// BoardCommit: sentinel on commitment field
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

// PendingShot: sentinel on shooter (ContractAddress)
pub fn get_opt_pending_shot(
    world: WorldStorage,
    game_id: felt252,
    turn_no: u32
) -> Option<PendingShot> {
    let rec: PendingShot = world.read_model((game_id, turn_no));
    if rec.shooter.into() != 0 {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// AttackerShot: sentinel on fired (the non-key field)
pub fn get_opt_attacker_shot(
    world: WorldStorage,
    game_id: felt252,
    attacker: ContractAddress,
    x: u8,
    y: u8
) -> Option<AttackerShot> {
    let rec: AttackerShot = world.read_model((game_id, attacker, x, y));
    // Check 'fired' field since key fields are always populated by Dojo
    if rec.fired {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// NullifierSet: sentinel on 'used' field (the non-key field)
pub fn get_opt_nullifier(
    world: WorldStorage,
    game_id: felt252,
    nullifier: felt252
) -> Option<NullifierSet> {
    let rec: NullifierSet = world.read_model((game_id, nullifier));
    // Check 'used' field since key fields are always populated by Dojo
    if rec.used {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// StartCommit: sentinel on commit field
pub fn get_opt_start_commit(
    world: WorldStorage,
    game_id: felt252,
    player: ContractAddress
) -> Option<StartCommit> {
    let rec: StartCommit = world.read_model((game_id, player));
    if rec.commit != 0 {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// StartReveal: sentinel on player (not nonce - 0 is valid nonce)
pub fn get_opt_start_reveal(
    world: WorldStorage,
    game_id: felt252,
    player: ContractAddress
) -> Option<StartReveal> {
    let rec: StartReveal = world.read_model((game_id, player));
    if rec.player.into() != 0 {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// Escrow: sentinel on token (ContractAddress)
pub fn get_opt_escrow(
    world: WorldStorage,
    game_id: felt252
) -> Option<Escrow> {
    let rec: Escrow = world.read_model(game_id);
    if rec.token.into() != 0 {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// CellHit: sentinel on 'hit' field (the non-key field)
pub fn get_opt_cell_hit(
    world: WorldStorage,
    game_id: felt252,
    player: ContractAddress,
    x: u8,
    y: u8
) -> Option<CellHit> {
    let rec: CellHit = world.read_model((game_id, player, x, y));
    // Check 'hit' field since key fields are always populated by Dojo
    if rec.hit {
        Option::Some(rec)
    } else {
        Option::None
    }
}

// ShipAliveCount: sentinel on remaining_hits (non-zero means record exists)
pub fn get_opt_ship_alive_count(
    world: WorldStorage,
    game_id: felt252,
    player: ContractAddress
) -> Option<ShipAliveCount> {
    let rec: ShipAliveCount = world.read_model((game_id, player));
    // Check if remaining_hits is non-zero (default would be 0)
    if rec.remaining_hits != 0 {
        Option::Some(rec)
    } else {
        Option::None
    }
}

