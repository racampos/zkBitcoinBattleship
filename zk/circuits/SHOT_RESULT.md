Awesome — here’s a tight, production-style Noir circuit for your **ShotResult** proof using **Poseidon2** throughout, plus a minimal `Nargo.toml`.

---

# `Nargo.toml`

```toml
[package]
name = "battleship_shot_result"
type = "bin"
# compiler_version = "^1.0.0-beta.13"   # Optional but recommended to pin your toolchain

[dependencies]
# Poseidon2 for Noir (library provides Poseidon & Poseidon2; we import the Poseidon2 crate)
# Pin to a concrete release tag from the repo’s Releases tab and use the subdirectory.
poseidon2 = { git = "https://github.com/TaceoLabs/noir-poseidon", tag = "vX.Y.Z", directory = "poseidon2" }
```

> Notes
> • The Poseidon2 Noir lib is published by TaceoLabs; it exposes the Poseidon2 permutation & hash helpers as a standalone crate under the `poseidon2/` subfolder. Pinning by `tag` and using the `directory` key is the standard way to depend on a sub-crate in Nargo. ([GitHub][1])
> • Function naming follows the same pattern as the official Poseidon lib (e.g., `poseidon::bn254::hash_8`), and Poseidon2 provides analogous `hash_t` entry points per state size. ([core.taceo.io][2])

Replace `vX.Y.Z` with a release tag from the repo’s Releases list.

---

# `src/main.nr`

```rust
// ShotResult: prove an honest hit/miss at (x,y) against a previously committed board,
// and produce a replay-proof nullifier — all without revealing the board.
//
// Hashing: Poseidon2 over BN254 (efficient for Garaga/Cairo verification)

use dep::poseidon2::bn254::{hash_2, hash_4};

// Public return type bundling all outputs we want to reveal.
struct ShotOutput {
    commitment: Field, // poseidon2_hash(board || salt)
    x: u32,            // echoed
    y: u32,            // echoed
    result: Field,     // 0 = miss, 1 = hit
    nullifier: Field,  // poseidon2_hash([commitment, x, y, nullifier_salt])
}

// Deterministic commitment function used game-wide.
// We fold the preimage left-to-right with Poseidon2’s 2-ary hash:
// acc_0 = 0;  acc_{i+1} = H2(acc_i, item_i);  output = H2(acc_100, salt)
// (H2 = poseidon2::bn254::hash_2)
fn commit_board(board: [Field; 100], salt: Field) -> Field {
    let mut acc: Field = 0;
    for i in 0..100 {
        acc = hash_2([acc, board[i]]);
    }
    hash_2([acc, salt])
}

// Unique nullifier per (commitment, x, y, secret nullifier_salt)
fn compute_nullifier(commitment: Field, x: u32, y: u32, nullifier_salt: Field) -> Field {
    // Cast coords into Field elements in-circuit
    let xf: Field = x as Field;
    let yf: Field = y as Field;
    hash_4([commitment, xf, yf, nullifier_salt])
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

    // Compute linearized cell index: idx = y*10 + x (0..99 by construction)
    let idx: u32 = (y * 10u32) + x;

    // 2) Honest result: reveal exactly board[idx] (0 or 1)
    let cell: Field = board[idx];

    // 1) Commitment linkage: recompute commitment from (board || salt)
    let commitment: Field = commit_board(board, salt);

    // 4) Nullifier: binds this exact shot & secret salt to prevent replay
    let nullifier: Field = compute_nullifier(commitment, x, y, nullifier_salt);

    ShotOutput {
        commitment,
        x,
        y,
        result: cell,
        nullifier,
    }
}
```

---

## Why the nullifier stops replays

The circuit outputs `nullifier = Poseidon2(commitment, x, y, nullifier_salt)`.
Because the prover must know the _original_ `board` and `salt` to reproduce `commitment` (Constraint 1), and also supplies a fresh private `nullifier_salt`, the nullifier uniquely binds to that exact `(commitment, x, y, nullifier_salt)` tuple. Your verifier or game contract can store seen nullifiers and reject duplicates. This prevents anyone from replaying an old “hit” proof at the same coordinate or a different game instance — even if the public `(commitment, x, y, result)` values are the same, the prover can’t regenerate the same nullifier without the (private) `nullifier_salt`.

---

### Implementation notes

- **Poseidon2 dependency**: the TaceoLabs repo provides a dedicated **Poseidon2** Noir crate; add it via `git+tag+directory` as shown above. ([GitHub][1])
- **Hash calls**: This uses the common Noir style `hash_t` API (e.g., `hash_2`, `hash_4`), as documented for Poseidon and mirrored in Poseidon2 libraries. ([core.taceo.io][2])
- **On-chain (Garaga / Cairo)**: The contract only checks the proof; it doesn’t rehash the board. If you do need to recompute the nullifier off-chain/on-chain, make sure you mirror the exact folding definition (`hash_2` left-fold for commitment; `hash_4` for nullifier) and the `u32 → Field` cast for `x`/`y`.
- **Performance**: This circuit purposefully avoids any board-validation rules (done at commit time) and uses small-arity Poseidon2 hashes to keep constraints predictable and Starknet-friendly. For further optimization, you can commit to a Merkle root once and verify Merkle openings per shot, but that’s a protocol change (different commitment definition).

If you want, I can also drop in a tiny JS/Cairo helper showing the **exact same** fold used here so your off-chain/on-chain code computes the same `commitment` and `nullifier`.

[1]: https://github.com/TaceoLabs/noir-poseidon "GitHub - TaceoLabs/noir-poseidon"
[2]: https://core.taceo.io/articles/poseidon2-for-noir/?utm_source=chatgpt.com "Poseidon{2} for Noir"

Corrected implementation:

You’re absolutely right — thanks for catching that. Here’s the corrected, production-ready **ShotResult** circuit that uses the **exact same** Poseidon2 commitment definition as your BoardCommit (one call to `poseidon2::hash` on `[board[0..100], salt]`), and also switches the nullifier to `poseidon2::hash` over a 4-element array.

---

# `Nargo.toml`

```toml
[package]
name = "battleship_shot_result"
type = "bin"
# Pin your toolchain if you like:
# compiler_version = ">=0.36.0"

[dependencies]
poseidon2 = { git = "https://github.com/TaceoLabs/noir-poseidon", tag = "v0.4.0", directory = "poseidon2" }
```

---

# `src/main.nr`

```rust
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
```

---

## How the nullifier prevents replays (brief)

The circuit outputs
`nullifier = poseidon2::hash([commitment, x, y, nullifier_salt])`.

- It’s **bound to the exact shot** `(x,y)` and the board `commitment`.
- It also depends on a **secret** `nullifier_salt` known only to the defender.
- Your contract (or off-chain verifier) stores seen `nullifier`s and **rejects duplicates**.
- An attacker cannot replay an old proof at the same coordinates or across games because they cannot recreate the same nullifier without the defender’s private `nullifier_salt`, and any fresh proof (even for the same `(x,y)`) will yield a **different** nullifier if the salt changes.
