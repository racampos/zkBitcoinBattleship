use starknet::ContractAddress;

// Board commitment (ZK proof of valid placement)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct BoardCommit {
    #[key]
    pub game_id: felt252,
    #[key]
    pub player: ContractAddress,
    pub commitment: felt252,
    pub rules_hash: felt252,
}

// Cell hit tracking (prevents double-counting)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct CellHit {
    #[key]
    pub game_id: felt252,
    #[key]
    pub player: ContractAddress,
    #[key]
    pub x: u8,
    #[key]
    pub y: u8,
    pub hit: bool,
}

// Ship alive tracking (deterministic win condition)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ShipAliveCount {
    #[key]
    pub game_id: felt252,
    #[key]
    pub player: ContractAddress,
    pub remaining_hits: u8,
}
