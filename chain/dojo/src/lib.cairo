// Model implementations
mod models_impl {
    pub mod game;
    pub mod board;
    pub mod shot;
    pub mod escrow;
}

// Re-export models
pub use models_impl::game::{Game, GameStatus, StartCommit, StartReveal};
pub use models_impl::board::{BoardCommit, CellHit, ShipAliveCount};
pub use models_impl::shot::{PendingShot, AttackerShot, Shot, NullifierSet};
pub use models_impl::escrow::Escrow;

// Systems
pub mod systems {
    pub mod game_management;
    pub mod coin_flip;
    pub mod gameplay;
    pub mod timeout;
    pub mod escrow;
    pub mod board_commit;
    pub mod proof_verify;
}

// Helpers
pub mod helpers {
    pub mod constants;
    pub mod errors;
    pub mod get_opt;
    pub mod game_helpers;
}

// Mock contracts for testing
pub mod mock_wbtc;