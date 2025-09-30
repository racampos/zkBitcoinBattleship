use starknet::ContractAddress;

// Game status values (using u8 for Dojo storage compatibility)
pub mod GameStatus {
    pub const Created: u8 = 0;
    pub const Started: u8 = 1;
    pub const Finished: u8 = 2;
    pub const Cancelled: u8 = 3;
}

// Main game state
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Game {
    #[key]
    pub id: felt252,
    pub p1: ContractAddress,
    pub p2: ContractAddress,
    pub status: u8, // Use u8 instead of enum for Dojo storage
    pub turn_player: ContractAddress,
    pub board_size: u8,
    pub rules_hash: felt252,
    pub turn_no: u32,
    pub last_action: u64,
    pub winner: ContractAddress,
    pub start_deadline: u64,
}

// Coin-flip commit phase
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct StartCommit {
    #[key]
    pub game_id: felt252,
    #[key]
    pub player: ContractAddress,
    pub commit: felt252,
    pub timestamp: u64,
}

// Coin-flip reveal phase
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct StartReveal {
    #[key]
    pub game_id: felt252,
    #[key]
    pub player: ContractAddress,
    pub nonce: felt252,
}
