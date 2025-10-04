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
