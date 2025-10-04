Awesome—here’s your Noir circuit updated to use **Poseidon2** for the commitment, plus the `Nargo.toml` tweak to pull in the Poseidon2 crate. All validation logic (ship counting, contiguity, bounds, etc.) stays exactly the same as before—only the hash changed.

---

### `src/main.nr`

```rust
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
```

---

### `Nargo.toml`

```toml
[package]
name = "battleship_board_commit"
type = "bin"
authors = ["you"]
# Use a compiler compatible with recent poseidon2 releases
# (v0.4.0 targets Noir v1.0.0-beta.9 per the tag notes).
compiler_version = ">=1.0.0-beta.9"

[dependencies]
# Poseidon2 (Noir) by TaceoLabs. The repo is a multi-crate workspace, so we
# point at the "poseidon2" subdirectory and pin a released tag.
poseidon2 = { git = "https://github.com/TaceoLabs/noir-poseidon", tag = "v0.4.0", directory = "poseidon2" }
```

**Why this dependency format?** Nargo dependencies should be pinned with a `tag` and may specify a sub-`directory` when a repo hosts multiple crates, exactly like shown in the official docs. ([noir-lang.org][1])
Poseidon2 for Noir is provided by TaceoLabs with a current tag `v0.4.0` (notes mention fixes for Noir `v1.0.0-beta.9`). ([GitHub][2])

---

## Starknet-specific notes & optional optimizations

- **Match on-chain hashing:** Starknet uses Poseidon natively in Cairo for many hashes, so Poseidon-family commitments tend to be cheaper to verify than Pedersen in modern flows. (Docs describe Poseidon as a core builtin used for class/program/tx hashing.) ([StarkNet][3])
- **Bit-packing (optional):** To cut Poseidon2 absorption rounds, you can pack the 100 bits of `board` into **4 field elements** (e.g., 3×32 bits + 1×4 bits), then hash `[packed0, packed1, packed2, packed3, salt]`. This reduces constraints for hashing and calldata overhead for on-chain verification, without changing semantics. (Keep your current layout if you need exactly the same commitment bytes as before.)
- **Domain separation (optional):** If the same salt may be re-used across contexts, consider prefixing a constant tag (e.g., `"BSHP"` as a field) before the preimage to avoid cross-domain collisions.
- **Parameter compatibility:** The Taceo Poseidon2 library implements Poseidon2 over BN254 with supported state widths (including `t=3`, which aligns with common Cairo usage). That keeps prover/verifier behavior consistent with Starknet tooling. ([Ingonyama][4])

If you’d like, I can also give you a **packed-preimage variant** of the circuit as a drop-in alternative.

[1]: https://noir-lang.org/docs/noir/modules_packages_crates/dependencies "Dependencies | Noir Documentation"
[2]: https://github.com/TaceoLabs/noir-poseidon/tags "Tags · TaceoLabs/noir-poseidon · GitHub"
[3]: https://www.starknet.io/cairo-book/ch12-04-hash.html?utm_source=chatgpt.com "Working with Hashes - The Cairo Programming Language"
[4]: https://dev.ingonyama.com/2.8.0/icicle/primitives/poseidon2?utm_source=chatgpt.com "Poseidon2 | ICICLE Docs - Ingonyama"
