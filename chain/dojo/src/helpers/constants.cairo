// constants.cairo - Single source of truth for game constants

// Timeout durations (in seconds)
pub const TIMEOUT_DURATION: u64 = 120; // 2 minutes for in-match actions
pub const START_REVEAL_DEADLINE: u64 = 300; // 5 minutes to reveal after both commits
pub const CANCEL_GRACE: u64 = 300; // 5 minutes grace before allowing cancel with one commit

// Domain separation tags (must match Noir circuits)
pub const BSCM_TAG: felt252 = 0x4253434D; // "BSCM" - Board Commitment domain tag
pub const BSHOT_TAG: felt252 = 0x42534854; // "BSHT" - Shot nullifier domain tag
pub const COIN_TAG: felt252 = 0x434F494E; // "COIN" - Coin-flip commitment domain tag

// Game parameters
pub const TOTAL_SHIP_CELLS: u8 = 17; // Carrier(5) + Battleship(4) + Cruiser(3) + Submarine(3) + Destroyer(2)
pub const BOARD_SIZE: u8 = 10; // 10×10 grid (hardcoded in circuits)
