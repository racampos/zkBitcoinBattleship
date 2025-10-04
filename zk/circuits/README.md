# ZK Circuits for BitcoinShip Battleship

This directory contains the Noir circuits for zero-knowledge proofs in the Battleship game.

## Circuits

### 1. BoardCommit (`board_commit/`)

**Purpose:** Proves that a player's initial board placement is valid without revealing ship positions.

**Private Inputs:**
- `board[100]`: 10×10 grid flattened row-major (0 = water, 1 = ship)
- `salt`: Random field element for commitment

**Public Output:**
- `commitment`: `Poseidon2(board || salt)`

**Constraints:**
- Board entries are bits (0 or 1)
- Exactly 17 total ship cells
- Exactly 5 ships with lengths: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)
- Ships are straight (horizontal or vertical only)
- Ships are contiguous and non-branching
- Ships do not touch orthogonally
- All coordinates within 10×10 bounds

### 2. ShotResult (`shot_result/`)

**Purpose:** Proves whether a shot at coordinates (x,y) hits or misses without revealing the full board.

**Private Inputs:**
- `board[100]`: 10×10 grid flattened row-major
- `salt`: Salt used in original commitment
- `x, y`: Shot coordinates
- `nullifier_salt`: Secret salt for replay protection

**Public Outputs:**
- `commitment`: `Poseidon2(board || salt)` (must match stored commitment)
- `x, y`: Shot coordinates (echoed)
- `result`: 0 = miss, 1 = hit
- `nullifier`: `Poseidon2([commitment, x, y, nullifier_salt])` for replay prevention

**Constraints:**
- Coordinates within bounds (x, y ∈ [0,9])
- Result equals `board[y*10 + x]`
- Commitment matches original board commitment
- Nullifier is unique per (commitment, x, y, nullifier_salt)

## Commitment Scheme

Both circuits use **identical commitment schemes** to ensure compatibility:

```rust
// Preimage: [board[0], board[1], ..., board[99], salt]
let mut preimage: [Field; 101] = [0; 101];
for i in 0..100 {
    preimage[i] = board[i];
}
preimage[100] = salt;
let commitment = poseidon2::hash(preimage);
```

This ensures that:
1. A board committed with `BoardCommit` can be proven against in `ShotResult`
2. The defender cannot change their board after committing
3. The commitment links to the exact board state

## Hash Function

Both circuits use **Poseidon2** for hashing, optimized for Starknet:
- More efficient SNARK performance than Pedersen
- Cheaper on-chain verification costs
- Native support in Cairo/Starknet ecosystem
- Dependency: [TaceoLabs/noir-poseidon](https://github.com/TaceoLabs/noir-poseidon) v0.4.0

## Installation

### Prerequisites

1. **Install Noir** (version >=1.0.0-beta.9):
   ```bash
   curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
   noirup --version 1.0.0-beta.9
   ```

2. **Verify installation:**
   ```bash
   nargo --version
   ```

## Building Circuits

### Check Syntax (BoardCommit)
```bash
cd board_commit
nargo check
```

### Check Syntax (ShotResult)
```bash
cd shot_result
nargo check
```

### Compile to ACIR
```bash
# In either circuit directory
nargo compile
```

This generates:
- `target/main.json`: ACIR representation
- `target/Prover.toml`: Example inputs

## Testing

Create test cases in `Prover.toml`:

### BoardCommit Example
```toml
# Valid 10x10 board with ships
board = ["0", "0", "1", "1", "1", "1", "1", ...]  # 100 values
salt = "0x1234567890abcdef"
```

### ShotResult Example
```toml
board = ["0", "0", "1", ...]  # Same board as committed
salt = "0x1234567890abcdef"  # Same salt as committed
x = "5"
y = "3"
nullifier_salt = "0xfedcba0987654321"
```

Run tests:
```bash
nargo test
```

## Generating Proofs

### Prove (requires witness)
```bash
nargo prove
```

This generates `proofs/main.proof`.

### Verify
```bash
nargo verify
```

## Integration with Starknet (Garaga)

**Next Steps:**

1. **Compile circuits to ACIR:**
   ```bash
   nargo compile
   ```

2. **Use Garaga to generate Cairo verifier:**
   ```bash
   # Garaga will convert ACIR → Cairo verifier contract
   # (Specific commands depend on Garaga tooling)
   ```

3. **Deploy Cairo verifier to Starknet:**
   - The verifier becomes a Starknet contract
   - Takes proof + public inputs as parameters
   - Returns `true` if proof is valid

4. **Update game contracts:**
   - Replace mock verification in `board_commit.cairo`
   - Replace mock verification in `proof_verify.cairo`
   - Call Garaga verifier contracts instead

## Current Status

✅ **Circuit Design:** Complete and verified compatible  
✅ **Noir Implementation:** Complete  
⏳ **Compilation Testing:** Pending (requires Noir toolchain)  
⏳ **Garaga Integration:** Pending  
⏳ **Cairo Verifier Generation:** Pending  
⏳ **On-chain Deployment:** Pending  

## Security Considerations

1. **Commitment Binding:** Once a player commits their board, they cannot change it without changing the commitment (which would be detected on-chain).

2. **Zero-Knowledge:** Board positions remain hidden; only hit/miss results are revealed.

3. **Replay Protection:** The nullifier prevents reusing the same proof multiple times.

4. **Soundness:** A dishonest prover cannot:
   - Commit an invalid board (BoardCommit enforces rules)
   - Lie about hit/miss results (ShotResult enforces `result = board[x,y]`)
   - Prove against a different board (commitment must match)

5. **Salt Requirements:**
   - `salt`: Must be random and kept secret until game end
   - `nullifier_salt`: Must be unique per proof to prevent replays

## References

- [Noir Language Docs](https://noir-lang.org/docs)
- [TaceoLabs Poseidon2](https://github.com/TaceoLabs/noir-poseidon)
- [Garaga (SNARK verifier for Starknet)](https://github.com/keep-starknet-strange/garaga)
- [Starknet Poseidon Hashing](https://www.starknet.io/cairo-book/ch12-04-hash.html)

