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

// Bitcoin staking parameters
// WBTC addresses (update when deploying to different networks)
// - Katana (local): 0x066604cab8d009317131f7282b1c875311a41e3cac91af22858a92a0ddcfa0 (Mock WBTC)
// - Mainnet: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
pub const WBTC_ADDRESS: felt252 = 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac; // Real WBTC on Mainnet
// 1,000 satoshis in WBTC (WBTC has 8 decimals, same as BTC)
pub const STAKE_AMOUNT_SATS: u256 = 1000; // 0.00001 BTC (~$1 USD at current prices)
pub const STAKING_TIMEOUT: u64 = 3600; // 1 hour to stake after P2 joins
