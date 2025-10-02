// coin_flip.cairo - Commit-reveal coin flip to determine first player

use starknet::ContractAddress;

#[starknet::interface]
pub trait ICoinFlip<T> {
    fn start_game_commit(ref self: T, game_id: felt252, commit: felt252);
    fn start_game_reveal(ref self: T, game_id: felt252, nonce: felt252);
    fn timeout_flip(ref self: T, game_id: felt252);
}

#[dojo::contract]
pub mod coin_flip {
    use super::ICoinFlip;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, StartCommit, StartReveal};
    use crate::helpers::errors;
    use crate::helpers::constants::START_REVEAL_DEADLINE;
    use crate::helpers::get_opt::{
        get_opt_start_commit, get_opt_start_reveal, get_opt_board_commit, get_opt_escrow
    };
    use crate::helpers::game_helpers::{coin_commit, transfer_token};

    #[abi(embed_v0)]
    impl CoinFlipImpl of ICoinFlip<ContractState> {
        fn start_game_commit(ref self: ContractState, game_id: felt252, commit: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let g: Game = world.read_model(game_id);

            // Guard: only players can commit
            errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

            // Guard: can't commit twice
            let existing = get_opt_start_commit(world, game_id, caller);
            errors::require(existing.is_none(), 'ALREADY_COMMITTED_FLIP');

            // Record commitment
            let start_commit = StartCommit {
                game_id,
                player: caller,
                commit,
                timestamp: get_block_timestamp()
            };
            world.write_model(@start_commit);

            // If both players committed, set reveal deadline
            let p1_commit = get_opt_start_commit(world, game_id, g.p1);
            let p2_commit = get_opt_start_commit(world, game_id, g.p2);

            if p1_commit.is_some() && p2_commit.is_some() {
                let mut g2 = g;
                g2.start_deadline = get_block_timestamp() + START_REVEAL_DEADLINE;
                world.write_model(@g2);
            }
        }

        fn start_game_reveal(ref self: ContractState, game_id: felt252, nonce: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let g: Game = world.read_model(game_id);

            // Guard: both commits must exist before any reveal (prevents early reveal bias)
            let c1 = get_opt_start_commit(world, game_id, g.p1);
            let c2 = get_opt_start_commit(world, game_id, g.p2);
            errors::require(c1.is_some() && c2.is_some(), 'COMMITS_NOT_COMPLETE');

            // Guard: can't reveal twice
            let existing_reveal = get_opt_start_reveal(world, game_id, caller);
            errors::require(existing_reveal.is_none(), 'ALREADY_REVEALED_FLIP');

            // Guard: deadline must be set and not passed
            errors::require(
                g.start_deadline != 0 && get_block_timestamp() <= g.start_deadline,
                'REVEAL_DEADLINE_PASSED'
            );

            // Fetch commitment
            let commit_rec: StartCommit = world.read_model((game_id, caller));

            // Verify commitment with domain-separated hash
            let expected_commit = coin_commit(game_id, caller, nonce);
            errors::require(commit_rec.commit == expected_commit, 'INVALID_COMMIT');

            // Store reveal
            let start_reveal = StartReveal { game_id, player: caller, nonce };
            world.write_model(@start_reveal);

            // If both revealed, determine starting player
            let p1_reveal = get_opt_start_reveal(world, game_id, g.p1);
            let p2_reveal = get_opt_start_reveal(world, game_id, g.p2);

            if p1_reveal.is_some() && p2_reveal.is_some() {
                // Require boards committed before starting (prevents choosing placement after coin-flip)
                let bc1 = get_opt_board_commit(world, game_id, g.p1);
                let bc2 = get_opt_board_commit(world, game_id, g.p2);
                errors::require(bc1.is_some() && bc2.is_some(), 'BOARDS_NOT_COMMITTED');

                // XOR nonces and mod to get 0 or 1
                let nonce1: u256 = p1_reveal.unwrap().nonce.into();
                let nonce2: u256 = p2_reveal.unwrap().nonce.into();
                let combined = nonce1 ^ nonce2;
                
                let mut g2 = g;
                g2.turn_player = if (combined % 2) == 0 {
                    g.p1
                } else {
                    g.p2
                };
                g2.status = GameStatus::Started;
                g2.last_action = get_block_timestamp();
                world.write_model(@g2);
            }
        }

        fn timeout_flip(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let mut g: Game = world.read_model(game_id);
            
            errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');
            errors::require(g.start_deadline != 0, 'NO_DEADLINE');
            errors::require(get_block_timestamp() > g.start_deadline, 'DEADLINE_NOT_PASSED');

            // Both commits must exist
            let c1 = get_opt_start_commit(world, game_id, g.p1);
            let c2 = get_opt_start_commit(world, game_id, g.p2);
            errors::require(c1.is_some() && c2.is_some(), 'COMMITS_NOT_COMPLETE');

            // Exactly one reveal present (XOR)
            let r1 = get_opt_start_reveal(world, game_id, g.p1);
            let r2 = get_opt_start_reveal(world, game_id, g.p2);
            errors::require(r1.is_some() != r2.is_some(), 'NOT_EXACTLY_ONE_REVEAL');

            let revealer = if r1.is_some() { g.p1 } else { g.p2 };
            let non_revealer = if revealer == g.p1 { g.p2 } else { g.p1 };

            // Require boards committed before starting
            let bc1 = get_opt_board_commit(world, game_id, g.p1);
            let bc2 = get_opt_board_commit(world, game_id, g.p2);
            errors::require(bc1.is_some() && bc2.is_some(), 'BOARDS_NOT_COMMITTED');

            // Slash non-revealer's bond to revealer (if escrow exists)
            let e_opt = get_opt_escrow(world, game_id);
            if e_opt.is_some() {
                let e = e_opt.unwrap();
                let slashed = if non_revealer == g.p1 { e.bond_p1 } else { e.bond_p2 };
                if slashed != 0 {
                    transfer_token(e.token, revealer, slashed);
                    let mut e2 = e;
                    if non_revealer == g.p1 {
                        e2.bond_p1 = 0;
                    } else {
                        e2.bond_p2 = 0;
                    }
                    world.write_model(@e2);
                }
            }

            // Start the game, revealer goes first
            g.status = GameStatus::Started;
            g.turn_player = revealer;
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

