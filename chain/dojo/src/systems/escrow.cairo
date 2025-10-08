// escrow.cairo - Token staking and settlement

#[starknet::interface]
pub trait IEscrow<T> {
    fn stake_and_bond(ref self: T, game_id: felt252, token: starknet::ContractAddress, stake: u256, bond: u256);
    fn settle_escrow(ref self: T, game_id: felt252);
    fn refund_bond(ref self: T, game_id: felt252);
}

#[dojo::contract]
pub mod escrow {
    use super::IEscrow;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use dojo::model::ModelStorage;
    use crate::{Game, GameStatus, Escrow};
    use crate::helpers::errors;
    use crate::helpers::get_opt::get_opt_escrow;
    use crate::helpers::game_helpers::{transfer_token, settle_escrow_internal_for_winner};
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_security::ReentrancyGuardComponent;

    #[abi(embed_v0)]
    impl EscrowImpl of IEscrow<ContractState> {
        fn stake_and_bond(
            ref self: ContractState,
            game_id: felt252,
            token: ContractAddress,
            stake: u256,
            bond: u256
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let total = stake + bond;

            // Enforce single token per game
            let existing_escrow = get_opt_escrow(world, game_id);
            if existing_escrow.is_some() {
                errors::require(existing_escrow.unwrap().token == token, 'TOKEN_MISMATCH');
            }

            // Pull funds from player to this contract via transfer_from
            // Player must have approved this contract for at least `total` amount
            let erc20 = IERC20Dispatcher { contract_address: token };
            let this_contract = get_contract_address();
            let success = erc20.transfer_from(caller, this_contract, total);
            assert(success, 'TRANSFER_FROM_FAILED');

            let mut e = existing_escrow.unwrap_or(
                Escrow {
                    game_id,
                    token,
                    stake_p1: 0,
                    stake_p2: 0,
                    bond_p1: 0,
                    bond_p2: 0,
                }
            );

            // Attribute balances to p1/p2 based on role
            let g: Game = world.read_model(game_id);
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

            world.write_model(@e);
        }

        fn settle_escrow(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let g: Game = world.read_model(game_id);
            errors::require(g.status == GameStatus::Finished, 'GAME_NOT_FINISHED');

            let e: Escrow = world.read_model(game_id);
            let e2 = settle_escrow_internal_for_winner(game_id, g.winner, e);
            world.write_model(@e2);
        }

        fn refund_bond(ref self: ContractState, game_id: felt252) {
            let mut world = self.world_default();
            let g: Game = world.read_model(game_id);
            errors::require(g.status == GameStatus::Cancelled, 'NOT_CANCELLED');

            let mut e: Escrow = world.read_model(game_id);
            transfer_token(e.token, g.p1, e.stake_p1 + e.bond_p1);
            transfer_token(e.token, g.p2, e.stake_p2 + e.bond_p2);
            e.stake_p1 = 0;
            e.stake_p2 = 0;
            e.bond_p1 = 0;
            e.bond_p2 = 0;
            world.write_model(@e);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"battleship")
        }
    }
}

