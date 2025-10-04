// BoardCommit — Poseidon2 version (for Starknet)
//
// Inputs (private):
//  - board[100]: 10x10 grid flattened row-major (0 = water, 1 = ship)
//  - salt: random field element
// Output (public):
//  - commitment = Poseidon2(board || salt)
//
// Constraints enforced:
//  - board entries are bits (0/1)
//  - exactly 17 total ship cells
//  - exactly 5 ships with lengths {5,4,3,3,2}
//  - ships are straight (purely horizontal or vertical), contiguous, non-branching
//  - ships do not touch orthogonally (so components don't merge)
//  - all indices within the 10x10 bounds by construction
//
// NOTE: Only change vs. the Pedersen version is the hash: now poseidon2::hash.

use poseidon2; // provided by TaceoLabs/noir-poseidon (poseidon2 crate)

// === Small helpers ===

const N: u32 = 10;
const BOARD_CELLS: u32 = 100;

fn idx(r: u32, c: u32) -> u32 {
    // r,c are assumed < N
    r * N + c
}

fn cell(board: [Field; 100], r: u32, c: u32) -> Field {
    // caller guarantees r,c < N
    board[idx(r, c) as usize]
}

// Gets board[r,c] if in-bounds, else returns 0.
// Useful for neighbour checks at edges.
fn cell_or_zero(board: [Field; 100], r: i32, c: i32) -> Field {
    if (r < 0) | (c < 0) | (r >= N as i32) | (c >= N as i32) {
        0
    } else {
        let rr: u32 = r as u32;
        let cc: u32 = c as u32;
        board[idx(rr, cc) as usize]
    }
}

// Assert board bits and return total number of 1s (as Field).
fn assert_bits_and_count_ones(board: [Field; 100]) -> Field {
    let mut ones: Field = 0;
    for i in 0..BOARD_CELLS {
        let b = board[i as usize];
        // Bitness: b in {0,1}
        assert(b * (1 - b) == 0);
        ones += b;
    }
    ones
}

// Walk a straight ship starting at (r,c).
// A "start" is defined as a '1' whose up and left neighbours are 0.
// Returns its length (u32) and asserts shape correctness (straight & non-branching).
fn consume_ship_from_start(board: [Field; 100], r: u32, c: u32) -> u32 {
    // We know board[r,c] == 1 and up/left are zero (caller ensures).
    // Determine orientation by peeking right/down.
    let right = if c + 1 < N { cell(board, r, c + 1) } else { 0 };
    let down  = if r + 1 < N { cell(board, r + 1, c) } else { 0 };

    // If both right and down are 1, it's an L/branch — not allowed.
    assert(!((right == 1) & (down == 1)));

    if right == 1 {
        // Horizontal ship
        // Ensure no vertical branches along the way (cells above/below must be 0)
        // and ensure contiguity until it ends.
        let mut len: u32 = 1;
        // Check that the cell above/below the starting tile are zero
        if (r as i32 - 1) >= 0       { assert(cell_or_zero(board, r as i32 - 1, c as i32) == 0); }
        if (r as i32 + 1) < N as i32 { assert(cell_or_zero(board, r as i32 + 1, c as i32) == 0); }

        let mut col = c + 1;
        while col < N {
            let here = cell(board, r, col);
            if here == 1 {
                // No vertical branches at any segment
                if (r as i32 - 1) >= 0       { assert(cell_or_zero(board, r as i32 - 1, col as i32) == 0); }
                if (r as i32 + 1) < N as i32 { assert(cell_or_zero(board, r as i32 + 1, col as i32) == 0); }
                len += 1;
                col += 1;
            } else {
                break;
            }
        }
        // The cell immediately before start (left) must be zero (caller guarantees start),
        // and immediately after end must be zero (or out-of-bounds).
        // We've already ensured above/below are zero along the body.
        len
    } else if down == 1 {
        // Vertical ship — mirror of horizontal case
        let mut len: u32 = 1;

        // Check left/right of starting tile are zero
        if (c as i32 - 1) >= 0       { assert(cell_or_zero(board, r as i32, c as i32 - 1) == 0); }
        if (c as i32 + 1) < N as i32 { assert(cell_or_zero(board, r as i32, c as i32 + 1) == 0); }

        let mut row = r + 1;
        while row < N {
            let here = cell(board, row, c);
            if here == 1 {
                // No horizontal branches at any segment
                if (c as i32 - 1) >= 0       { assert(cell_or_zero(board, row as i32, c as i32 - 1) == 0); }
                if (c as i32 + 1) < N as i32 { assert(cell_or_zero(board, row as i32, c as i32 + 1) == 0); }
                len += 1;
                row += 1;
            } else {
                break;
            }
        }
        len
    } else {
        // Isolated single '1' — not a valid ship length for Battleship
        assert(false);
        0
    }
}

fn main(board: [Field; 100], salt: Field) -> pub Field {
    // 1) Bitness + total ship cells
    let ones = assert_bits_and_count_ones(board);
    assert(ones == 17);

    // 2) Scan board for ship starts and validate each ship's shape & length
    let mut count_len2: Field = 0;
    let mut count_len3: Field = 0;
    let mut count_len4: Field = 0;
    let mut count_len5: Field = 0;

    for r in 0..N {
        for c in 0..N {
            let b = cell(board, r, c);
            if b == 1 {
                let up_is_one   = if r > 0 { cell(board, r - 1, c) == 1 } else { false };
                let left_is_one = if c > 0 { cell(board, r, c - 1) == 1 } else { false };

                // Start of a ship if top and left are zero (or out of bounds).
                if !(up_is_one | left_is_one) {
                    let len = consume_ship_from_start(board, r, c);

                    // Tally by length
                    if len == 2u32 {
                        count_len2 += 1;
                    } else if len == 3u32 {
                        count_len3 += 1;
                    } else if len == 4u32 {
                        count_len4 += 1;
                    } else if len == 5u32 {
                        count_len5 += 1;
                    } else {
                        // any other length is invalid
                        assert(false);
                    }
                }
            }
        }
    }

    // Expected multiset: {5,4,3,3,2}
    assert(count_len2 == 1);
    assert(count_len3 == 2);
    assert(count_len4 == 1);
    assert(count_len5 == 1);

    // 3) Compute Poseidon2 commitment over (board || salt)
    //    Preimage layout identical to the previous Pedersen version.
    let mut preimage: [Field; 101] = [0; 101];
    for i in 0..BOARD_CELLS {
        preimage[i as usize] = board[i as usize];
    }
    preimage[100] = salt;

    // --- The only line that changed: use Poseidon2 instead of Pedersen ---
    let commitment = poseidon2::hash(preimage);

    commitment
}

