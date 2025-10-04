use starknet::ContractAddress;

#[starknet::interface]
pub trait IGameManagement<T> {
    fn create_game(ref self: T, p2: ContractAddress, board_size: u8, nonce: felt252) -> felt252;
    fn join_game(ref self: T, game_id: felt252);
}

#[dojo::contract]
pub mod game_management {
    use super::IGameManagement;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use core::poseidon::poseidon_hash_span;
    use crate::{Game, GameStatus};
    use crate::helpers::constants::BOARD_SIZE;
    use crate::helpers::errors;
    
    #[abi(embed_v0)]
    impl GameManagementImpl of IGameManagement<ContractState> {
        fn create_game(ref self: ContractState, p2: ContractAddress, board_size: u8, nonce: felt252) -> felt252 {
            let mut world = self.world_default();
            let p1 = get_caller_address();
            
            // Enforce 10×10 board size (circuits hardcoded for this)
            errors::require(board_size == BOARD_SIZE, 'BAD_BOARD_SIZE');
            
            // Generate unique game ID using poseidon with client-provided random nonce
            let mut hash_input = array![
                p1.into(), 
                p2.into(), 
                get_block_timestamp().into(),
                nonce // Random nonce from client ensures uniqueness
            ];
            let game_id = poseidon_hash_span(hash_input.span());
            
            // Zero ContractAddress for initialization
            let zero_ca: ContractAddress = 0.try_into().unwrap();
            
            // Create game
            let game = Game {
                id: game_id,
                p1,
                p2,
                status: GameStatus::Created, // u8 constant
                turn_player: zero_ca,
                board_size,
                turn_no: 0,
                last_action: get_block_timestamp(),
                winner: zero_ca,
                start_deadline: 0,
            };
            
            world.write_model(@game);
            
            // TODO: Emit GameCreated event when events are set up
            
            game_id
        }

        fn join_game(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut g: Game = world.read_model(game_id);

            // Guard: game must exist (p1 != 0)
            errors::require(g.p1.into() != 0, 'GAME_NOT_FOUND');

            // Guard: can't join if P2 already set
            let zero_ca: ContractAddress = 0.try_into().unwrap();
            errors::require(g.p2 == zero_ca, 'GAME_FULL');

            // Guard: can't join your own game
            errors::require(caller != g.p1, 'CANT_JOIN_OWN_GAME');

            // Guard: game must not be started yet
            errors::require(g.status == GameStatus::Created, 'GAME_ALREADY_STARTED');

            // Set caller as P2 and auto-start game (P1 goes first)
            g.p2 = caller;
            g.status = GameStatus::Started; // Skip coin-flip, P1 goes first
            g.turn_player = g.p1; // P1 always starts (like white in chess)
            g.last_action = get_block_timestamp();
            world.write_model(@g);

            // TODO: Emit PlayerJoined and GameStarted events
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}
