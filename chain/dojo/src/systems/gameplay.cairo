// gameplay.cairo - Core gameplay: firing shots

#[starknet::interface]
pub trait IGameplay<T> {
    fn fire_shot(ref self: T, game_id: felt252, x: u8, y: u8);
}

#[dojo::contract]
pub mod gameplay {
    use super::IGameplay;
    use starknet::{get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, PendingShot, AttackerShot};
    use crate::helpers::errors;
    use crate::helpers::get_opt::{get_opt_board_commit, get_opt_pending_shot, get_opt_attacker_shot};

    #[abi(embed_v0)]
    impl GameplayImpl of IGameplay<ContractState> {
        fn fire_shot(ref self: ContractState, game_id: felt252, x: u8, y: u8) {
            let mut world = self.world_default();
            let mut g: Game = world.read_model(game_id);

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

            // Prevent multiple pending shots this turn
            let pending = get_opt_pending_shot(world, game_id, g.turn_no);
            errors::require(pending.is_none(), 'ALREADY_PENDING');

            // Guard against duplicate targeting by same attacker
            let already = get_opt_attacker_shot(world, game_id, get_caller_address(), x, y);
            errors::require(already.is_none(), 'ALREADY_SHOT_HERE');

            // Record shot attempt to prevent duplicates (NEVER deleted)
            let attacker_shot = AttackerShot {
                game_id,
                attacker: get_caller_address(),
                x,
                y,
                fired: true,
            };
            world.write_model(@attacker_shot);

            // Record pending shot
            let pending_shot = PendingShot {
                game_id,
                turn_no: g.turn_no,
                shooter: get_caller_address(),
                x,
                y,
            };
            world.write_model(@pending_shot);

            // Update last_action to start defender's timer
            g.last_action = get_block_timestamp();
            world.write_model(@g);

            // TODO: Emit ShotFired event
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}


