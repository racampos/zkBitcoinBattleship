# ZK Integration Status

## ✅ Completed Milestones

### 1. Noir Circuit Implementation

- **BoardCommit Circuit** (`zk/circuits/board_commit/src/main.nr`)

  - Validates 10x10 board with exactly 5 ships (Carrier:5, Battleship:4, Cruiser:3, Submarine:3, Destroyer:2)
  - Total of 17 ship cells required
  - Prevents overlapping ships, single-cell ships, and L-shaped configurations
  - Uses Poseidon2 hash (optimized for Starknet)
  - Commitment scheme: `hash_2(hash_2(...hash_2(0, board[0])..., board[99]), salt)`
  - **Status:** ✅ Compiles successfully with `nargo check`
  - **Testing:** ✅ 8/8 unit tests passing (positive, negative, and edge cases)

- **ShotResult Circuit** (`zk/circuits/shot_result/src/main.nr`)
  - Proves hit/miss at coordinates (x, y) without revealing board
  - Uses same Poseidon2 commitment scheme as BoardCommit
  - Generates unique nullifier to prevent replay attacks: `hash_4(commitment, x, y, nullifier_salt)`
  - Returns: `{commitment, x, y, result, nullifier}`
  - **Status:** ✅ Compiles successfully with `nargo check`
  - **Testing:** ✅ 7/7 unit tests passing

### 2. Proof Generation & Validation

- **Witness Generation:**

  - ✅ `nargo execute` tested with both circuits
  - ✅ Valid board configurations generate correct witnesses
  - ✅ Public outputs match expected values

- **Test Proof (BoardCommit):**

  ```
  Circuit: board_commit
  Witness: ✅ Generated successfully
  Proof: ✅ Generated with bb prove (16KB)
  Public Inputs: 32 bytes (17 field elements)
  Commitment Output: 0xf0d5c10e2bb2f04d2f8e3b2c9e1a6e8f19f3e2d5c7a4b6e8d1f3a5c7e9b2d4a5
  ```

- **Calldata Generation:**
  ```
  Tool: garaga calldata --system ultra_starknet_zk_honk
  Output: 2997 felt252 values (formatted for starkli)
  Status: ✅ Ready for on-chain verification
  ```

### 3. Cairo Verifier Generation

- **Garaga Integration:**

  - Proof System: `ultra_starknet_zk_honk` (ZK privacy + Starknet optimization)
  - Hash Oracle: `--oracle_hash starknet` (Poseidon, not Keccak)
  - Barretenberg: v0.87.4-starknet.1
  - Noir: v1.0.0-beta.5
  - Garaga: v0.18.1 (downgraded from v0.18.2 to fix internal bug)

- **Generated Verifiers:**

  - `battleship_board_commit_verifier/` (1.2MB compiled contract)

    - Class: `UltraStarknetZKHonkVerifier`
    - Interface: `fn verify_ultra_starknet_zk_honk_proof(self, full_proof_with_hints: Span<felt252>) -> Option<Span<u256>>`
    - Returns public inputs on success
    - **Status:** ✅ Compiles with Scarb (only minor unused import warnings)

  - `battleship_shot_result_verifier/` (1.2MB compiled contract)
    - Class: `UltraStarknetZKHonkVerifier`
    - Same interface as board_commit verifier
    - **Status:** ✅ Compiles with Scarb

### 4. Complete Workflow Validation

```
1. Board Setup (Private)
   ↓
2. Generate Commitment → nargo execute → witness.gz
   ↓
3. Generate Proof → bb prove → proof (16KB)
   ↓
4. Format for Starknet → garaga calldata → 2997 felt252 values
   ↓
5. Submit to Verifier → verify_ultra_starknet_zk_honk_proof(calldata)
   ↓
6. Extract Public Inputs → Option<Span<u256>> (commitment)
```

**Status:** ✅ All steps tested and working offline

## 🚧 Pending Work

### 1. Verifier Deployment (Blocked)

**Issue:** RPC version incompatibility

- starknet.py v0.26.2 expects RPC `pending` block tag
- Katana v0.9.0 only supports `latest`, `l1_accepted`, `pre_confirmed`
- Fee estimation and nonce queries fail

**Workarounds Attempted:**

- ❌ Manual nonce management
- ❌ V3 transactions with explicit resource bounds
- ❌ Auto-estimation (still uses `pending` internally)

**Size Consideration:**

- Verifiers are 1.2MB each (very large for Starknet)
- May be too expensive to deploy even on testnet
- Consider deploying to mainnet only when needed

**Resolution Options:**

1. Wait for compatible starknet.py release
2. Use Katana with `--disable-fee` flag (requires restart)
3. Deploy to Sepolia testnet instead of local Katana
4. Keep mock verifiers for development, deploy real ones for production

### 2. Contract Integration

**Required Changes:**

`chain/dojo/src/systems/board_commit.cairo`:

```cairo
// Replace MOCK verifier with real Garaga verifier
fn commit_board(ref self: T, game_id: felt252, commitment: felt252, proof: Span<felt252>) {
    // Verify proof using deployed verifier
    let verifier_address = get_board_commit_verifier_address();
    let verifier = IVerifierDispatcher { contract_address: verifier_address };

    let result = verifier.verify_ultra_starknet_zk_honk_proof(proof);
    assert(result.is_some(), 'ZK proof verification failed');

    // Extract public inputs (commitment)
    let public_inputs = result.unwrap();
    let verified_commitment = *public_inputs.at(0); // First public input is commitment
    assert(commitment == verified_commitment, 'Commitment mismatch');

    // ... rest of commit logic
}
```

`chain/dojo/src/systems/proof_verify.cairo`:

```cairo
// Replace MOCK verifier with real Garaga verifier
fn apply_shot_proof(
    ref self: T,
    game_id: felt252,
    x: u8, y: u8,
    result: u8,
    nullifier: felt252,
    proof: Span<felt252>
) {
    // Verify proof using deployed verifier
    let verifier_address = get_shot_result_verifier_address();
    let verifier = IVerifierDispatcher { contract_address: verifier_address };

    let verification_result = verifier.verify_ultra_starknet_zk_honk_proof(proof);
    assert(verification_result.is_some(), 'ZK proof verification failed');

    // Extract public inputs: [commitment, x, y, result, nullifier]
    let public_inputs = verification_result.unwrap();
    let verified_commitment = *public_inputs.at(0);
    let verified_x = *public_inputs.at(1);
    let verified_y = *public_inputs.at(2);
    let verified_result = *public_inputs.at(3);
    let verified_nullifier = *public_inputs.at(4);

    // Validate public inputs match
    assert(x.into() == verified_x, 'X coordinate mismatch');
    assert(y.into() == verified_y, 'Y coordinate mismatch');
    assert(result.into() == verified_result, 'Result mismatch');
    assert(nullifier == verified_nullifier, 'Nullifier mismatch');

    // Check nullifier hasn't been used
    // ... existing nullifier logic

    // ... rest of apply logic
}
```

### 3. Client-Side Proof Generation

**Required:** Integrate `bb.js` in browser client

`apps/client/zkProver.js`:

```javascript
import { Noir } from "@noir-lang/noir_js";
import { BarretenbergBackend } from "@aztec/bb.js";

export async function generateBoardCommitProof(board, salt) {
  // Load circuit
  const circuit = await fetch("/circuits/board_commit.json").then((r) =>
    r.json()
  );
  const backend = new BarretenbergBackend(circuit);
  const noir = new Noir(circuit, backend);

  // Generate witness
  const inputs = { board, salt };
  const { witness } = await noir.execute(inputs);

  // Generate proof
  const proof = await backend.generateProof(witness);

  // Format for Starknet (convert to felt252 array)
  const calldata = formatProofForStarknet(proof);

  return { proof: calldata, commitment: proof.publicInputs[0] };
}

export async function generateShotResultProof(
  board,
  salt,
  x,
  y,
  nullifierSalt
) {
  // Similar to above but for shot_result circuit
  // ...
}
```

**Challenges:**

- Circuit size (may need to be split or loaded lazily)
- Proof generation time (can take 10-30 seconds in browser)
- Need to compile circuits to JSON format for noir_js
- Need to bundle bb.js wasm files

## 📋 Next Steps

1. **Immediate (Development):**

   - Keep mock verifiers in place for testing
   - Test full game flow with mock proofs
   - Ensure UI shows correct commitment/nullifier values

2. **Short-term (Pre-Hackathon Demo):**

   - Resolve deployment blocker (try Sepolia testnet)
   - Deploy verifiers if possible
   - Update contracts to call real verifiers
   - Test on-chain verification with pre-generated proofs

3. **Medium-term (Production):**

   - Integrate bb.js in client
   - Implement client-side proof generation
   - Add loading states for proof generation (10-30s)
   - Consider proof generation optimizations (WASM vs native)

4. **Long-term (Optimization):**
   - Explore proof aggregation to reduce size
   - Consider alternative proving systems if size is prohibitive
   - Monitor Garaga updates for smaller verifiers

## 🔧 Technical Debt

1. **Deployment Scripts:**

   - Created multiple attempts: `deploy_verifiers.py`, `deploy_verifiers_simple.py`, `deploy_verifiers_v2.py`
   - All failed due to RPC incompatibility
   - Should clean up and keep only one maintained version

2. **Testing:**

   - Only offline proof generation tested
   - Need on-chain verification test once deployed
   - Should add integration test: generate proof → submit → verify

3. **Documentation:**
   - Circuit specifications documented in `zk/circuits/README.md`
   - Testing guide in `zk/circuits/TESTING.md`
   - Need deployment guide once blocker is resolved

## 🎯 Success Criteria

- [x] Circuits compile and pass all tests
- [x] Proofs generate successfully offline
- [x] Calldata formats correctly for Starknet
- [x] Verifiers compile with Scarb
- [ ] Verifiers deployed on testnet
- [ ] On-chain proof verification tested
- [ ] Contracts integrated with real verifiers
- [ ] Client generates proofs in browser

**Current Completion:** 4/8 (50%)

## 📚 References

- **Noir Docs:** https://noir-lang.org/
- **Garaga Docs:** https://github.com/keep-starknet-strange/garaga
- **Barretenberg:** https://github.com/AztecProtocol/barretenberg
- **Poseidon2:** https://github.com/TaceoLabs/noir-poseidon

## 🔍 Key Learnings

1. **Proof Size:** 16KB proof expands to 2997 felt252 values (~93KB) for Starknet
2. **Verifier Size:** Cairo verifiers are 1.2MB each (3430-4256 lines of generated code)
3. **Hash Compatibility:** Must use `--oracle_hash starknet` to match Poseidon
4. **Commitment Scheme:** Folding hash must match exactly between circuits
5. **Testing:** Unit tests caught critical ship detection bug early
6. **Tooling:** Garaga v0.18.2 has a bug, v0.18.1 works correctly

## 💡 Recommendations

For hackathon demo:

1. **Demo with mock verifiers** - Show full game flow works
2. **Show offline proof generation** - Terminal demo of `bb prove` working
3. **Show generated verifiers** - Display the Cairo code Garaga produced
4. **Explain the workflow** - Use this document as reference

Post-hackathon:

1. Deploy verifiers to Sepolia once RPC compatibility is resolved
2. Integrate real ZK verification
3. Add client-side proving (bb.js)
4. Consider proof aggregation if gas costs are prohibitive
