// timeout.cairo - Timeout, resign, and cancel functionality

#[starknet::interface]
pub trait ITimeout<T> {
    fn timeout(ref self: T, game_id: felt252);
    fn resign(ref self: T, game_id: felt252);
    fn cancel_unstarted(ref self: T, game_id: felt252);
}

#[dojo::contract]
pub mod timeout {
    use super::ITimeout;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, Escrow};
    use crate::helpers::errors;
    use crate::helpers::constants::{TIMEOUT_DURATION, CANCEL_GRACE};
    use crate::helpers::get_opt::{get_opt_escrow, get_opt_start_commit};
    use crate::helpers::game_helpers::{
        expected_offender, get_opponent, transfer_token, settle_escrow_internal_for_winner
    };

    #[abi(embed_v0)]
    impl TimeoutImpl of ITimeout<ContractState> {
        fn timeout(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let g: Game = world.read_model(game_id);

            // Determine who we're waiting on
            let offender = expected_offender(world, game_id);
            let caller = get_caller_address();

            // Only opponent can call timeout
            errors::require(caller == get_opponent(world, game_id, offender), 'ONLY_OPPONENT');

            // Check timeout conditions
            let now = get_block_timestamp();
            errors::require(now > g.last_action + TIMEOUT_DURATION, 'NOT_TIMED_OUT');

            let winner = get_opponent(world, game_id, offender);

            // Slash bond and settle escrow (if it exists)
            let e_opt = get_opt_escrow(world, game_id);
            if e_opt.is_some() {
                let mut escrow = e_opt.unwrap();

                // Transfer slashed bond from offender to winner
                let slashed_bond = if offender == g.p1 {
                    escrow.bond_p1
                } else {
                    escrow.bond_p2
                };
                if slashed_bond != 0 {
                    transfer_token(escrow.token, winner, slashed_bond);
                }

                if offender == g.p1 {
                    escrow.bond_p1 = 0;
                } else {
                    escrow.bond_p2 = 0;
                }

                // Settle stakes to winner as well
                escrow = settle_escrow_internal_for_winner(game_id, winner, escrow);

                // Refund winner's bond
                let winner_bond = if winner == g.p1 {
                    escrow.bond_p1
                } else {
                    escrow.bond_p2
                };
                if winner_bond != 0 {
                    transfer_token(escrow.token, winner, winner_bond);
                }
                if winner == g.p1 {
                    escrow.bond_p1 = 0;
                } else {
                    escrow.bond_p2 = 0;
                }

                world.write_model(@escrow);
            }

            // Set winner and finish game
            let mut g2 = g;
            g2.status = GameStatus::Finished;
            g2.winner = winner;
            world.write_model(@g2);

            // TODO: Emit GameFinished and EscrowSettled events
        }

        fn resign(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let g: Game = world.read_model(game_id);

            // Only players can resign
            errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

            // Can only resign during active game
            errors::require(g.status == GameStatus::Started, 'NOT_STARTED');

            // Opponent wins
            let winner = get_opponent(world, game_id, caller);

            // Set winner and finish
            let mut g2 = g;
            g2.status = GameStatus::Finished;
            g2.winner = winner;
            world.write_model(@g2);

            // Settle escrow if it exists
            let e_opt = get_opt_escrow(world, game_id);
            if e_opt.is_some() {
                let e = e_opt.unwrap();
                let mut e2 = settle_escrow_internal_for_winner(game_id, winner, e);
                
                // Refund bonds to both players
                transfer_token(e2.token, g.p1, e2.bond_p1);
                transfer_token(e2.token, g.p2, e2.bond_p2);
                e2.bond_p1 = 0;
                e2.bond_p2 = 0;
                world.write_model(@e2);
            }

            // TODO: Emit GameFinished event
        }

        fn cancel_unstarted(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let g: Game = world.read_model(game_id);
            let caller = get_caller_address();
            let now = get_block_timestamp();

            // Only players can cancel
            errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

            // Can only cancel if not started or finished
            errors::require(g.status != GameStatus::Started, 'GAME_STARTED');
            errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');

            // Check commit status
            let c1 = get_opt_start_commit(world, game_id, g.p1);
            let c2 = get_opt_start_commit(world, game_id, g.p2);

            // Can cancel if: no commits, one commit + grace, or reveal deadline passed
            let no_commits = c1.is_none() && c2.is_none();
            let one_commit_grace = (c1.is_some() != c2.is_some())
                && {
                    let commit_time = if c1.is_some() {
                        c1.unwrap().timestamp
                    } else {
                        c2.unwrap().timestamp
                    };
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
            world.write_model(@g2);

            // TODO: Emit GameCancelled event
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}

