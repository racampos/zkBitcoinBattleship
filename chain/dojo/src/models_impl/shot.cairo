use starknet::ContractAddress;

// Pending shot (one per turn)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PendingShot {
    #[key]
    pub game_id: felt252,
    #[key]
    pub turn_no: u32,
    pub shooter: ContractAddress,
    pub x: u8,
    pub y: u8,
}

// Attacker shot record (prevents duplicate targeting)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct AttackerShot {
    #[key]
    pub game_id: felt252,
    #[key]
    pub attacker: ContractAddress,
    #[key]
    pub x: u8,
    #[key]
    pub y: u8,
    pub fired: bool, // Non-key field required by Dojo
}

// Completed shot with result
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Shot {
    #[key]
    pub game_id: felt252,
    #[key]
    pub turn_no: u32,
    pub x: u8,
    pub y: u8,
    pub result: u8,
}

// Nullifier set (prevents replay)
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct NullifierSet {
    #[key]
    pub game_id: felt252,
    #[key]
    pub nullifier: felt252,
    pub used: bool, // Non-key field required by Dojo
}
