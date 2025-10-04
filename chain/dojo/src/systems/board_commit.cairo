// board_commit.cairo - Board commitment with ZK proof verification
// Currently using MOCK verifier - will be replaced with Garaga verifier
// Rules are hardcoded: 10x10 board, 5 ships (Carrier:5, Battleship:4, Cruiser:3, Submarine:3, Destroyer:2)

#[starknet::interface]
pub trait IBoardCommit<T> {
    fn commit_board(
        ref self: T,
        game_id: felt252,
        commitment: felt252
        // Note: proof parameter removed for MVP - will add back with real ZK
    );
}

#[dojo::contract]
pub mod board_commit {
    use super::IBoardCommit;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, BoardCommit};
    use crate::helpers::errors;
    use crate::helpers::constants::BOARD_SIZE;
    use crate::helpers::get_opt::get_opt_board_commit;

    #[abi(embed_v0)]
    impl BoardCommitImpl of IBoardCommit<ContractState> {
        fn commit_board(
            ref self: ContractState,
            game_id: felt252,
            commitment: felt252
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let g: Game = world.read_model(game_id);

            // Guard: only players can commit
            errors::require(caller == g.p1 || caller == g.p2, 'NOT_PLAYER');

            // Guard: can't commit after game is finished (allow during Started for MVP)
            errors::require(g.status != GameStatus::Finished, 'GAME_FINISHED');

            // Guard: board size must be 10×10 (circuits hardcoded)
            errors::require(g.board_size == BOARD_SIZE, 'BAD_BOARD_SIZE');

            // Mock verification (always passes for MVP - will add real ZK later)
            // When real ZK is added: verify proof that board has exactly 5 ships
            // with sizes [5,4,3,3,2], no overlaps, within bounds

            // Each player can only commit once
            let prior = get_opt_board_commit(world, game_id, caller);
            errors::require(prior.is_none(), 'ALREADY_COMMITTED');

            // Store commitment
            let board_commit = BoardCommit { game_id, player: caller, commitment };
            world.write_model(@board_commit);

            // If both players have now committed, update last_action
            let bc1 = get_opt_board_commit(world, game_id, g.p1);
            let bc2 = get_opt_board_commit(world, game_id, g.p2);
            if bc1.is_some() && bc2.is_some() {
                let mut g2 = g;
                g2.last_action = get_block_timestamp();
                world.write_model(@g2);

                // TODO: Emit BoardsReady event
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}


