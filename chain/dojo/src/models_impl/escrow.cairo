use starknet::ContractAddress;

// Escrow holds stakes and bonds
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Escrow {
    #[key]
    pub game_id: felt252,
    pub token: ContractAddress,
    pub stake_p1: u256,
    pub stake_p2: u256,
    pub bond_p1: u256,
    pub bond_p2: u256,
}
