// ShotResult: proves an honest hit/miss at (x,y) against an existing board commitment
// without revealing the board. Uses Poseidon2 with EXACTLY the same commitment
// preimage layout as BoardCommit: poseidon2::hash([board[0..100], salt])

use dep::poseidon2::hash;

struct ShotOutput {
    commitment: Field, // poseidon2::hash(board||salt)
    x: u32,            // echoed
    y: u32,            // echoed
    result: Field,     // 0 = miss, 1 = hit
    nullifier: Field,  // poseidon2::hash([commitment, x, y, nullifier_salt])
}

// EXACTLY matches BoardCommit:
// preimage = [board[0], ..., board[99], salt]
// commitment = poseidon2::hash(preimage)
fn commit_board(board: [Field; 100], salt: Field) -> Field {
    let mut preimage: [Field; 101] = [0; 101];
    for i in 0..100 {
        preimage[i] = board[i];
    }
    preimage[100] = salt;
    hash(preimage)
}

// Nullifier to prevent replay: poseidon2::hash([commitment, x, y, nullifier_salt])
fn compute_nullifier(commitment: Field, x: u32, y: u32, nullifier_salt: Field) -> Field {
    let xf: Field = x as Field;
    let yf: Field = y as Field;
    let input: [Field; 4] = [commitment, xf, yf, nullifier_salt];
    hash(input)
}

fn main(
    // PRIVATE INPUTS
    board: [Field; 100],
    salt: Field,
    x: u32,
    y: u32,
    nullifier_salt: Field,
) -> pub ShotOutput {
    // 3) Bounds: x,y in [0,9]
    assert(x <= 9u32);
    assert(y <= 9u32);

    // Compute flattened index (0..99)
    let idx: u32 = (y * 10u32) + x;

    // 2) Honest result: exactly equals board[idx]
    let cell: Field = board[idx];

    // 1) Commitment linkage: MUST match BoardCommit exactly
    let commitment: Field = commit_board(board, salt);

    // 4) Nullifier: unique per (commitment, x, y, nullifier_salt)
    let nullifier: Field = compute_nullifier(commitment, x, y, nullifier_salt);

    ShotOutput {
        commitment,
        x,
        y,
        result: cell,
        nullifier,
    }
}

