# Torii GraphQL Query Issue: React vs Vanilla JS

## Problem Statement

We have a Dojo/Torii-based Battleship game with two implementations:

1. **Vanilla JS version** (working perfectly)
2. **React version** (not working)

Both query Torii (a GraphQL indexer for Dojo/Starknet) to check if a player's board has been committed. The vanilla JS version successfully finds the `BoardCommit` entity within 2-3 seconds after the transaction is confirmed. The React version uses **identical GraphQL queries** but always receives empty results.

---

## Vanilla JS Implementation (WORKING)

### Code (game.js, lines 506-573)

```javascript
async function commitBoard() {
  if (!currentGameId) {
    currentGameId = prompt("Enter game ID:");
    if (!currentGameId) return;
  }

  const commitment = "0x" + "2".repeat(64); // Mock commitment

  try {
    const commitButton = document.getElementById("commit-board-button");
    commitButton.disabled = true;

    const tx = await account.execute({
      contractAddress: getContractAddress("battleship-board_commit"),
      entrypoint: "commit_board",
      calldata: [currentGameId, commitment],
    });

    console.log("Board commit tx:", tx.transaction_hash);
    document.getElementById(
      "board-status"
    ).textContent = `Committing... tx: ${tx.transaction_hash}`;

    // Wait and verify it actually worked
    setTimeout(async () => {
      // Query Torii to see if our board commit exists
      const response = await fetch("http://localhost:8081/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `{ entities(keys: ["${currentGameId}", "${account.address}"]) { edges { node { models { __typename ... on battleship_BoardCommit { commitment } } } } } }`,
        }),
      });

      const result = await response.json();
      const boardCommit = result.data?.entities?.edges[0]?.node?.models?.find(
        (m) => m.__typename === "battleship_BoardCommit"
      );

      if (boardCommit) {
        console.log("✅ Board Commit VERIFIED", {
          commitment: boardCommit.commitment,
        });
        document.getElementById(
          "board-status"
        ).textContent = `✅ Board committed! Game ready.`;
        // Keep button disabled on success
      } else {
        console.log("❌ Board Commit FAILED - Not found in Torii");
        document.getElementById(
          "board-status"
        ).textContent = `⚠️ Board commit may have failed. Check console.`;
        commitButton.disabled = false;
      }
    }, 3000);
  } catch (error) {
    console.error("Board commit error:", error);
    document.getElementById(
      "board-status"
    ).textContent = `❌ Error: ${error.message}`;
    document.getElementById("commit-board-button").disabled = false;
  }
}
```

### Vanilla JS Behavior

- ✅ Transaction sent successfully
- ✅ After 3 seconds, query finds `BoardCommit` entity
- ✅ UI updates to show "✅ Board committed!"

---

## React Implementation (NOT WORKING)

### Hook: useBoardCommitStatus.ts

```typescript
import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

export function useBoardCommitStatus() {
  const { gameId, account } = useGameStore();
  const [isCommitted, setIsCommitted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!gameId || !account) {
      setIsCommitted(false);
      return;
    }

    const checkCommitStatus = async () => {
      setIsChecking(true);
      try {
        // Use addresses exactly as-is (matching vanilla JS behavior)
        console.log("🔍 Query keys:", [gameId, account.address]);

        // Query using entities with composite keys [game_id, player]
        const response = await fetch("http://localhost:8081/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{
              entities(keys: ["${gameId}", "${account.address}"]) {
                edges {
                  node {
                    models {
                      __typename
                      ... on battleship_BoardCommit {
                        commitment
                        player
                        game_id
                      }
                    }
                  }
                }
              }
            }`,
          }),
        });

        const result = await response.json();
        console.log(
          "🔍 Board commit query result:",
          JSON.stringify(result, null, 2)
        );

        // Log the full structure
        if (result.data?.entities?.edges?.[0]) {
          console.log("🔍 Entity found:", result.data.entities.edges[0]);
          console.log("🔍 Models:", result.data.entities.edges[0].node?.models);
        } else {
          console.log(
            "🔍 No entities in response, edges:",
            result.data?.entities?.edges
          );
        }

        // Find BoardCommit model in the entity's models
        const boardCommit = result.data?.entities?.edges[0]?.node?.models?.find(
          (m: any) => m.__typename === "battleship_BoardCommit"
        );

        if (boardCommit && boardCommit.commitment) {
          console.log(
            "✅ Board commit found for player:",
            account.address.substring(0, 10) + "..."
          );
          console.log("   Commitment:", boardCommit.commitment);
          setIsCommitted(true);
        } else {
          console.log("❌ No board commit found yet");
          setIsCommitted(false);
        }
      } catch (error) {
        console.error("Error checking board commit status:", error);
        setIsCommitted(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkCommitStatus();

    // Check again after 3 seconds (matches vanilla JS setTimeout approach)
    const timeout = setTimeout(checkCommitStatus, 3000);

    // Also poll every 3 seconds while not committed
    const interval = setInterval(() => {
      if (!isCommitted) {
        checkCommitStatus();
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [gameId, account, isCommitted]);

  return { isCommitted, isChecking };
}
```

### Contract Call (useGameContracts.ts, commitBoard function)

```typescript
const commitBoard = async (boardHash: string) => {
  if (!sdk || !account || !gameId) return;

  setIsLoading(true);
  setError(null);

  try {
    console.log("🛡️ Committing board...");

    const tx = await account.execute({
      contractAddress: config.contracts.boardCommit,
      entrypoint: "commit_board",
      calldata: [gameId, boardHash],
    });

    console.log("📤 Transaction sent:", tx.transaction_hash);

    // Wait for transaction to be accepted
    await account.waitForTransaction(tx.transaction_hash, {
      retryInterval: 1000,
    });

    console.log("✅ Board committed!");
  } catch (err: any) {
    console.error("❌ Board commit failed:", err);
    setError(err.message || "Failed to commit board");
    throw err;
  } finally {
    setIsLoading(false);
  }
};
```

### React Logs (FAILING)

```
useGameContracts.ts:171 🛡️ Committing board...
useGameContracts.ts:179 📤 Transaction sent: 0x583e85a3776814a7b54a8fc2fb7579d1f29a50efdae3063bbef7a541758ded2
useGameContracts.ts:184 ✅ Board committed!

useBoardCommitStatus.ts:24 🔍 Query keys: (2) ['0x7b5d2a560e000471df7f085c1752a748740bc196aa1f7bcb8c02e4a5210c502', '0x9f23462410ecce054acd49911230443dff7b595d597fda42a7a1d054bb2c31']

useBoardCommitStatus.ts:51 🔍 Board commit query result: {
  "data": {
    "entities": {
      "edges": []
    }
  }
}

useBoardCommitStatus.ts:58 🔍 No entities in response, edges: []
useBoardCommitStatus.ts:71 ❌ No board commit found yet

[Repeats every 3 seconds with same empty result]
```

---

## Key Observations

### 1. Query Format is IDENTICAL

**Vanilla JS:**

```javascript
query: `{ entities(keys: ["${currentGameId}", "${account.address}"]) { edges { node { models { __typename ... on battleship_BoardCommit { commitment } } } } } }`;
```

**React:**

```typescript
query: `{
  entities(keys: ["${gameId}", "${account.address}"]) {
    edges {
      node {
        models {
          __typename
          ... on battleship_BoardCommit {
            commitment
            player
            game_id
          }
        }
      }
    }
  }
}`,
```

(The React version just has better formatting and fetches extra fields)

### 2. Keys Are Identical

Both use:

- `game_id`: `0x7b5d2a560e000471df7f085c1752a748740bc196aa1f7bcb8c02e4a5210c502`
- `account.address`: `0x9f23462410ecce054acd49911230443dff7b595d597fda42a7a1d054bb2c31`

### 3. Same Torii Endpoint

Both query `http://localhost:8081/graphql`

### 4. Same Timing

Both query ~3 seconds after transaction confirmation

### 5. Transaction Succeeds

Both versions successfully send the `commit_board` transaction and it confirms on-chain

### 6. Different Results

- **Vanilla JS**: Returns BoardCommit entity with commitment hash
- **React**: Returns empty `edges: []` array

---

## What We've Tried

1. ✅ **Verified query format** - Matches vanilla JS exactly
2. ✅ **Checked address padding** - Tried with/without padding to 66 chars
3. ✅ **Verified account object** - Both have same `account.address`
4. ✅ **Checked timing** - React polls every 3 seconds (vanilla waits 3s once)
5. ✅ **Verified game_id** - Same format in both versions
6. ✅ **Tried alternative query** - Used `battleshipBoardCommitModels(where: ...)` - also returns empty
7. ✅ **Checked network tab** - Both send identical POST requests to Torii
8. ✅ **Verified transaction** - Both transactions succeed and are indexed

---

## Questions

1. **Why does Torii return empty results for React but not vanilla JS?**

   - Same query
   - Same keys
   - Same endpoint
   - Same timing

2. **Could there be a difference in how the `account` object is constructed?**

   - Both use Cartridge Controller
   - Vanilla JS: Global `account` variable
   - React: `account` from Zustand store (set from Cartridge session)

3. **Could React's polling interfere with Torii's indexing?**

   - React queries immediately, then at 3s, 6s, 9s, etc.
   - Vanilla JS queries once at 3s

4. **Could there be a transaction hash vs transaction receipt timing issue?**

   - Vanilla JS doesn't wait for receipt, just uses `setTimeout`
   - React waits for `account.waitForTransaction()` before considering it "committed"

5. **Could the entity keys be case-sensitive or have invisible characters?**
   - Both log the same keys
   - But could there be encoding differences?

---

## Environment

- **Dojo**: Latest version
- **Torii**: Running on `http://localhost:8081`
- **Katana**: Running on `http://localhost:5050`
- **Cartridge Controller**: For wallet connection
- **Vanilla JS**: Pure JavaScript with `fetch`
- **React**: TypeScript with React 18, custom hook, Zustand store

---

## Request

Please analyze these two implementations and identify why the React version cannot find the `BoardCommit` entity in Torii when the vanilla JS version can, despite using identical GraphQL queries with identical parameters.
