// game_helpers.cairo - Helper functions for game state and operations

use starknet::ContractAddress;
use dojo::world::WorldStorage;
use dojo::model::ModelStorage;
use core::poseidon::poseidon_hash_span;
use crate::{Game, GameStatus, Escrow, CellHit, ShipAliveCount};
use crate::helpers::constants::{COIN_TAG, TOTAL_SHIP_CELLS};
use crate::helpers::get_opt::{
    get_opt_pending_shot, get_opt_cell_hit, get_opt_ship_alive_count, get_opt_escrow
};

// Get the current attacker (whose turn it is)
pub fn get_attacker_address(world: WorldStorage, game_id: felt252) -> ContractAddress {
    let g: Game = world.read_model(game_id);
    g.turn_player
}

// Get the current defender (opponent of turn_player)
pub fn get_defender_address(world: WorldStorage, game_id: felt252) -> ContractAddress {
    let g: Game = world.read_model(game_id);
    if g.turn_player == g.p1 {
        g.p2
    } else {
        g.p1
    }
}

// Get opponent of a specific player
pub fn get_opponent(
    world: WorldStorage,
    game_id: felt252,
    who: ContractAddress
) -> ContractAddress {
    let g: Game = world.read_model(game_id);
    if who == g.p1 {
        g.p2
    } else {
        g.p1
    }
}

// Determine who we're waiting on (for timeout logic)
pub fn expected_offender(world: WorldStorage, game_id: felt252) -> ContractAddress {
    let g: Game = world.read_model(game_id);
    // If there's a pending shot this turn, we're waiting on the defender's proof
    let pending = get_opt_pending_shot(world, game_id, g.turn_no);
    if pending.is_some() {
        get_defender_address(world, game_id)
    } else {
        g.turn_player
    }
}

// Domain-separated coin-flip commitment
pub fn coin_commit(game_id: felt252, player: ContractAddress, nonce: felt252) -> felt252 {
    // Domain-separated: poseidon([COIN_TAG, game_id, player, nonce])
    let mut input = array![COIN_TAG, game_id, player.into(), nonce];
    poseidon_hash_span(input.span())
}

// Token transfer helper (from escrow/system contract to recipient)
pub fn transfer_token(token: ContractAddress, to: ContractAddress, amount: u256) {
    if amount == 0 {
        return;
    }
    // Note: In production, use IERC20Dispatcher
    // For now, this is a placeholder that would call:
    // let erc20 = IERC20Dispatcher { contract_address: token };
    // erc20.transfer(to, amount);
    
    // TODO: Add OpenZeppelin ERC20 integration
}

// Settle escrow: pay stakes to winner (modifies escrow in place)
pub fn settle_escrow_internal_for_winner(
    game_id: felt252,
    winner: ContractAddress,
    escrow: Escrow
) -> Escrow {
    let total = escrow.stake_p1 + escrow.stake_p2;
    transfer_token(escrow.token, winner, total);
    
    Escrow {
        game_id: escrow.game_id,
        token: escrow.token,
        stake_p1: 0,
        stake_p2: 0,
        bond_p1: escrow.bond_p1,
        bond_p2: escrow.bond_p2,
    }
}

// Apply hit and check if game is won (deterministic)
pub fn apply_hit_and_check_win(
    mut world: WorldStorage,
    game_id: felt252,
    defender: ContractAddress,
    x: u8,
    y: u8,
    result: u8
) -> bool {
    if result == 0 {
        return false;
    } // Miss

    // Track hits per cell to prevent double-counting
    let existing_ch = get_opt_cell_hit(world, game_id, defender, x, y);
    let mut ch = if existing_ch.is_some() {
        core::option::OptionTrait::unwrap(existing_ch)
    } else {
        CellHit { game_id, player: defender, x, y, hit: false }
    };

    if ch.hit {
        return false;
    } // Already counted
    ch.hit = true;
    world.write_model(@ch);

    // Decrement remaining hits
    let existing_alive = get_opt_ship_alive_count(world, game_id, defender);
    let mut alive = if existing_alive.is_some() {
        core::option::OptionTrait::unwrap(existing_alive)
    } else {
        ShipAliveCount { game_id, player: defender, remaining_hits: TOTAL_SHIP_CELLS }
    };

    alive.remaining_hits -= 1;
    world.write_model(@alive);

    // Return true if all ships sunk
    alive.remaining_hits == 0
}

// Finalize win: set game status and auto-settle escrow
pub fn finalize_win(mut world: WorldStorage, game_id: felt252, winner: ContractAddress) {
    let mut g: Game = world.read_model(game_id);
    g.status = GameStatus::Finished;
    g.winner = winner;
    world.write_model(@g);

    // Auto-settle escrow (if it exists)
    let e_opt = get_opt_escrow(world, game_id);
    if e_opt.is_some() {
        let e = core::option::OptionTrait::unwrap(e_opt);

        // Transfer stakes to winner
        let mut e2 = settle_escrow_internal_for_winner(game_id, winner, e);

        // Refund bonds to both players
        transfer_token(e2.token, g.p1, e2.bond_p1);
        transfer_token(e2.token, g.p2, e2.bond_p2);
        e2.bond_p1 = 0;
        e2.bond_p2 = 0;

        world.write_model(@e2);
        // TODO: Emit EscrowSettled event
    }

    // TODO: Emit GameFinished event
}

