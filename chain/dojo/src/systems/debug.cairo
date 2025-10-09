// debug.cairo - Testing utilities (REMOVE BEFORE PRODUCTION!)

#[starknet::interface]
pub trait IDebug<T> {
    fn set_ship_alive_count(ref self: T, game_id: felt252, player: starknet::ContractAddress, remaining: u8);
}

#[dojo::contract]
pub mod debug {
    use super::IDebug;
    use starknet::ContractAddress;
    use dojo::model::ModelStorage;
    use crate::ShipAliveCount;

    #[abi(embed_v0)]
    impl DebugImpl of IDebug<ContractState> {
        /// Set remaining_hits for a player (for testing only!)
        fn set_ship_alive_count(
            ref self: ContractState,
            game_id: felt252,
            player: ContractAddress,
            remaining: u8
        ) {
            let mut world = self.world_default();
            
            let alive = ShipAliveCount {
                game_id,
                player,
                remaining_hits: remaining,
            };
            
            world.write_model(@alive);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}

