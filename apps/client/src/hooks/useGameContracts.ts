/**
 * Hook for game contract interactions
 */

import { useState } from "react";
import { Account } from "@cartridge/controller";
import { ToriiQueryBuilder, KeysClause } from "@dojoengine/sdk";
import { CONTRACTS, NAMESPACE } from "../dojo/config";
import { useGameStore } from "../store/gameStore";
import { useDojo } from "../dojo/DojoContext";
import { prepareV3Fees } from "../utils/feeHelper";

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

      const calls = {
        contractAddress: CONTRACTS.gameManagement.address,
        entrypoint: "create_game",
        calldata: [zeroAddress, boardSize, randomNonce], // p2, board_size, nonce
      };

      // Use prepareV3Fees with VERY generous bounds to prevent TTL eviction
      const feeDetails = await prepareV3Fees(account, [calls], {
        tipPercent: 50, // 50% tip to prioritize
        l1GasMultiplier: 300, // 3x headroom
        l2GasMultiplier: 300, // 3x headroom
      });

      console.log("⛽ Using V3 fees for create_game:", feeDetails);

      const tx = await account.execute(calls, undefined, feeDetails);

      console.log("📤 Transaction sent:", tx.transaction_hash);
      setTxHash(tx.transaction_hash);

      // Wait for transaction with timeout
      console.log("⏳ Waiting for transaction confirmation...");
      try {
        await account.waitForTransaction(tx.transaction_hash, {
          retryInterval: 1000,
          successStates: ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
        });
        console.log("✅ Transaction confirmed!");
      } catch (waitError: any) {
        console.error("❌ Error waiting for transaction:", waitError);
        throw new Error(`Transaction wait failed: ${waitError.message}`);
      }

      console.log("📋 Extracting game_id from receipt...");

      // Fetch transaction receipt to extract game_id from events
      const rpcUrl = import.meta.env.VITE_STARKNET_RPC_URL || "https://api.cartridge.gg/x/starknet/mainnet";
      const response = await fetch(rpcUrl, {
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

      const calls = {
        contractAddress: CONTRACTS.gameManagement.address,
        entrypoint: "join_game",
        calldata: [gameId],
      };

      const feeDetails = await prepareV3Fees(account, [calls], {
        tipPercent: 50,
        l1GasMultiplier: 300,
        l2GasMultiplier: 300,
      });
      const tx = await account.execute(calls, undefined, feeDetails);

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

      const calls = {
        contractAddress: CONTRACTS.boardCommit.address,
        entrypoint: "commit_board",
        calldata: [gameId, boardHash],
      };

      const feeDetails = await prepareV3Fees(account, [calls], {
        tipPercent: 50,
        l1GasMultiplier: 300,
        l2GasMultiplier: 300,
      });
      const tx = await account.execute(calls, undefined, feeDetails);

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

      const calls = {
        contractAddress: CONTRACTS.gameplay.address,
        entrypoint: "fire_shot",
        calldata: [gameId, row, col],
      };

      const feeDetails = await prepareV3Fees(account, [calls], {
        tipPercent: 50,
        l1GasMultiplier: 300,
        l2GasMultiplier: 300,
      });
      const tx = await account.execute(calls, undefined, feeDetails);

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

      const calls = {
        contractAddress: CONTRACTS.proofVerify.address,
        entrypoint: "apply_shot_proof",
        calldata: [gameId, row, col, result, nullifier],
      };

      const feeDetails = await prepareV3Fees(account, [calls], {
        tipPercent: 50,
        l1GasMultiplier: 300,
        l2GasMultiplier: 300,
      });
      const tx = await account.execute(calls, undefined, feeDetails);

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

  /**
   * Stake WBTC for game
   */
  const stakeForGame = async (wbtcAddress: string, stakeAmount: bigint) => {
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
      console.log(`💰 Staking ${stakeAmount} sats for game ${gameId}...`);

      // Stake+bond involves ERC20 transfer_from - needs explicit V3 fees with L1_DATA_GAS!
      const calls = {
        contractAddress: CONTRACTS.escrow.address,
        entrypoint: "stake_and_bond",
        calldata: [
          gameId,
          wbtcAddress,
          stakeAmount.toString(), // stake (u256 low)
          "0", // stake (u256 high)
          "0", // bond (u256 low)
          "0", // bond (u256 high)
        ],
      };

      const feeDetails = await prepareV3Fees(account, calls, {
        tipPercent: 50, // 50% tip to prioritize (was 20%)
        l1GasMultiplier: 300, // 3x headroom (was 2x)
        l2GasMultiplier: 300, // 3x headroom (was 2x)
        lockNonce: true,
      });

      const tx = await account.execute(calls, undefined, feeDetails);

      console.log("📤 Staking transaction sent:", tx.transaction_hash);
      setTxHash(tx.transaction_hash);

      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ Staking successful!");
      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to stake:", err);
      setError(err.message || "Failed to stake WBTC");
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
    stakeForGame,
    txHash,
    isLoading: useGameStore((s) => s.isLoading),
    error: useGameStore((s) => s.error),
  };
}
