/**
 * Hook for game contract interactions
 */

import { useState } from "react";
import { Account } from "@cartridge/controller";
import { ToriiQueryBuilder, KeysClause } from "@dojoengine/sdk";
import { CONTRACTS, NAMESPACE } from "../dojo/config";
import { useGameStore } from "../store/gameStore";
import { useDojo } from "../dojo/DojoContext";

export function useGameContracts(account: Account | null) {
  const { gameId, setGameId, setError, setIsLoading } = useGameStore();
  const { sdk } = useDojo();
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Create a new open game
   * Extracts game_id from transaction receipt events
   */
  const createGame = async () => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("🎲 Creating game...");

      // Generate random nonce for game creation
      const randomNonce = Math.floor(Math.random() * 1000000).toString();
      const zeroAddress = "0x0";
      const boardSize = "10";

      // Call create_game contract
      const tx = await account.execute({
        contractAddress: CONTRACTS.gameManagement.address,
        entrypoint: "create_game",
        calldata: [zeroAddress, boardSize, randomNonce], // p2, board_size, nonce
      });

      console.log("📤 Transaction sent:", tx.transaction_hash);
      setTxHash(tx.transaction_hash);

      // Wait for transaction
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Transaction confirmed! Extracting game_id from receipt...");

      // Fetch transaction receipt to extract game_id from events
      const response = await fetch("http://localhost:5050", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "starknet_getTransactionReceipt",
          params: [tx.transaction_hash],
          id: 1,
        }),
      });

      const data = await response.json();
      const receipt = data.result;

      if (receipt && receipt.execution_status === "REVERTED") {
        console.error("❌ Transaction REVERTED:", receipt.revert_reason);
        setError(`Transaction reverted: ${receipt.revert_reason || "Unknown reason"}`);
        return null;
      }

      if (receipt && receipt.execution_status === "SUCCEEDED") {
        // Look for Game model update event (contains game_id)
        // Game model selector hash: 0x19ecd3fc...
        const gameEvent = receipt.events?.find(
          (e: any) => e.keys && e.keys.length > 2 && e.keys[1]?.includes("19ecd3fc")
        );

        // Game ID is in data[1] (field value)
        const gameId = gameEvent?.data?.[1];

        if (gameId) {
          console.log("✅ Game created with ID:", gameId);
          setGameId(gameId);
          return gameId;
        } else {
          console.warn("⚠️ Could not find game_id in transaction events");
          console.warn("   Searched for event with key[1] containing '19ecd3fc'");
          console.warn("   Available event keys[1]:", receipt.events?.map((e: any) => e.keys?.[1]));
        }
      }

      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to create game:", err);
      setError(err.message || "Failed to create game");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Join an existing game
   */
  const joinGame = async (gameId: string) => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("🎮 Joining game:", gameId);

      // Call join_game contract
      const tx = await account.execute({
        contractAddress: CONTRACTS.gameManagement.address,
        entrypoint: "join_game",
        calldata: [gameId], // game_id as parameter
      });

      console.log("📤 Transaction sent:", tx.transaction_hash);
      setTxHash(tx.transaction_hash);

      // Wait for transaction
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Joined game!");
      setGameId(gameId);

      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to join game:", err);
      setError(err.message || "Failed to join game");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Commit board
   */
  const commitBoard = async (boardHash: string) => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    if (!gameId) {
      setError("No active game");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await account.execute({
        contractAddress: CONTRACTS.boardCommit.address,
        entrypoint: "commit_board",
        calldata: [gameId, boardHash],
      });

      console.log("📤 Board commit tx:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Board committed!");
      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to commit board:", err);
      setError(err.message || "Failed to commit board");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fire a shot
   */
  const fireShot = async (row: number, col: number) => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    const gameId = useGameStore.getState().gameId;
    if (!gameId) {
      setError("No active game");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`🎯 Firing shot at (${row}, ${col}) in game ${gameId}...`);

      const tx = await account.execute({
        contractAddress: CONTRACTS.gameplay.address,
        entrypoint: "fire_shot",
        calldata: [gameId, row, col],
      });

      console.log("📤 Transaction sent:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Shot fired!");
      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to fire shot:", err);
      setError(err.message || "Failed to fire shot");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply proof for opponent's shot (defender's action)
   */
  const applyProof = async (row: number, col: number, result: number) => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    const gameId = useGameStore.getState().gameId;
    if (!gameId) {
      setError("No active game");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`🛡️ Applying proof for shot at (${row}, ${col}): ${result === 1 ? 'HIT' : 'MISS'}`);

      // Generate random nullifier
      const nullifier = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');

      const tx = await account.execute({
        contractAddress: CONTRACTS.proofVerify.address,
        entrypoint: "apply_shot_proof",
        calldata: [gameId, row, col, result, nullifier],
      });

      console.log("📤 Proof transaction sent:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Proof applied! Turn should flip now.");
      
      // Update board locally immediately (don't wait for CellHit from Torii)
      const currentMyBoard = useGameStore.getState().myBoard;
      if (currentMyBoard) {
        const newBoard = currentMyBoard.map(r => [...r]);
        // result: 1 = hit (2 on board), 0 = miss (3 on board)
        newBoard[row][col] = result === 1 ? 2 : 3;
        useGameStore.getState().setMyBoard(newBoard);
        console.log(`📍 Updated defense board at (${row}, ${col}): ${result === 1 ? 'HIT' : 'MISS'}`);
      }
      
      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to apply proof:", err);
      setError(err.message || "Failed to apply proof");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createGame,
    joinGame,
    commitBoard,
    fireShot,
    applyProof,
    txHash,
    isLoading: useGameStore((s) => s.isLoading),
    error: useGameStore((s) => s.error),
  };
}
