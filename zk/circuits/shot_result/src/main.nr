// ShotResult: proves honest hit/miss at (x,y) without revealing the board
// Uses same Poseidon2 commitment scheme as BoardCommit

use dep::poseidon2::bn254::{hash_2, hash_4};

struct ShotOutput {
    commitment: Field,
    x: u32,
    y: u32,
    result: Field,
    nullifier: Field,
}

// EXACTLY matches BoardCommit commitment scheme
fn commit_board(board: [Field; 100], salt: Field) -> Field {
    let mut acc: Field = 0;
    for i in 0..100 {
        acc = hash_2([acc, board[i]]);
    }
    hash_2([acc, salt])
}

// Nullifier to prevent replay
fn compute_nullifier(commitment: Field, x: u32, y: u32, nullifier_salt: Field) -> Field {
    hash_4([commitment, x as Field, y as Field, nullifier_salt])
}

fn main(
    board: [Field; 100],
    salt: Field,
    x: u32,
    y: u32,
    nullifier_salt: Field,
) -> pub ShotOutput {
    // Bounds check: x,y in [0,9]
    assert(x < 10);
    assert(y < 10);

    // Compute index
    let idx = y * 10 + x;

    // Get result from board
    let cell: Field = board[idx];

    // Compute commitment (must match original)
    let commitment: Field = commit_board(board, salt);

    // Compute unique nullifier
    let nullifier: Field = compute_nullifier(commitment, x, y, nullifier_salt);

    ShotOutput {
        commitment,
        x,
        y,
        result: cell,
        nullifier,
    }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

// Helper: Create empty 10x10 board
fn empty_board() -> [Field; 100] {
    [0; 100]
}

// Helper: Place a horizontal ship starting at (row, col) with given length
fn place_horizontal_ship(board: [Field; 100], row: u32, col: u32, length: u32) -> [Field; 100] {
    let mut new_board = board;
    for i in 0..length {
        let index = row * 10 + col + i;
        new_board[index] = 1;
    }
    new_board
}

// Helper: Create a test board with a simple ship layout
fn test_board() -> [Field; 100] {
    let mut board = empty_board();
    // Place a 5-cell ship at row 3, columns 2-6
    board = place_horizontal_ship(board, 3, 2, 5);
    board
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[test]
fn test_shot_at_water_returns_miss() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Shot at (0, 0) which is water
    let output = main(board, salt, 0, 0, nullifier_salt);
    
    // Should return miss (0)
    assert(output.result == 0);
    assert(output.x == 0);
    assert(output.y == 0);
}

#[test]
fn test_shot_at_ship_returns_hit() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Shot at (3, 4) which has a ship
    let output = main(board, salt, 4, 3, nullifier_salt);
    
    // Should return hit (1)
    assert(output.result == 1);
    assert(output.x == 4);
    assert(output.y == 3);
}

#[test]
fn test_commitment_matches_across_shots() {
    let board = test_board();
    let salt = 12345;
    
    // Two different shots on same board
    let output1 = main(board, salt, 0, 0, 11111);
    let output2 = main(board, salt, 5, 5, 22222);
    
    // Commitments should be identical (same board + salt)
    assert(output1.commitment == output2.commitment);
}

#[test]
fn test_different_nullifier_salts_produce_different_nullifiers() {
    let board = test_board();
    let salt = 12345;
    
    // Same shot, different nullifier salts
    let output1 = main(board, salt, 5, 5, 11111);
    let output2 = main(board, salt, 5, 5, 22222);
    
    // Nullifiers should be different
    assert(output1.nullifier != output2.nullifier);
    
    // But results and commitments should be the same
    assert(output1.result == output2.result);
    assert(output1.commitment == output2.commitment);
}

#[test]
fn test_different_coordinates_produce_different_nullifiers() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Different shots, same nullifier salt
    let output1 = main(board, salt, 0, 0, nullifier_salt);
    let output2 = main(board, salt, 1, 1, nullifier_salt);
    
    // Nullifiers should be different (coordinates are part of nullifier)
    assert(output1.nullifier != output2.nullifier);
}

#[test]
fn test_nullifier_binds_to_commitment() {
    let board1 = test_board();
    let board2 = empty_board(); // Different board
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Same coordinates, different boards
    let output1 = main(board1, salt, 5, 5, nullifier_salt);
    let output2 = main(board2, salt, 5, 5, nullifier_salt);
    
    // Commitments should be different
    assert(output1.commitment != output2.commitment);
    
    // Nullifiers should be different (they include commitment)
    assert(output1.nullifier != output2.nullifier);
}

#[test]
fn test_all_corners_accessible() {
    let board = empty_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Test all four corners
    let top_left = main(board, salt, 0, 0, nullifier_salt);
    let top_right = main(board, salt, 9, 0, nullifier_salt + 1);
    let bottom_left = main(board, salt, 0, 9, nullifier_salt + 2);
    let bottom_right = main(board, salt, 9, 9, nullifier_salt + 3);
    
    // All should return miss (0) for empty board
    assert(top_left.result == 0);
    assert(top_right.result == 0);
    assert(bottom_left.result == 0);
    assert(bottom_right.result == 0);
}

#[test]
fn test_coordinates_echoed_correctly() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    let output = main(board, salt, 7, 3, nullifier_salt);
    
    // Public outputs should echo the input coordinates
    assert(output.x == 7);
    assert(output.y == 3);
}

#[test(should_fail)]
fn test_rejects_x_out_of_bounds_high() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // x = 10 is out of bounds (valid range is 0-9)
    let _ = main(board, salt, 10, 5, nullifier_salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_y_out_of_bounds_high() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // y = 10 is out of bounds
    let _ = main(board, salt, 5, 10, nullifier_salt); // Should fail
}

#[test(should_fail)]
fn test_rejects_both_coordinates_out_of_bounds() {
    let board = test_board();
    let salt = 12345;
    let nullifier_salt = 99999;
    
    // Both coordinates out of bounds
    let _ = main(board, salt, 15, 20, nullifier_salt); // Should fail
}
