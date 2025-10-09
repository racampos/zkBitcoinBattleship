/**
 * Hook for interacting with WBTC ERC20 contract
 * Handles approve and balance queries for staking
 */

import { useState } from "react";
import { Account } from "@cartridge/controller";
import { useGameStore } from "../store/gameStore";
import { CONTRACTS } from "../dojo/config";

// Mock WBTC address on Katana (from manifest)
const MOCK_WBTC_ADDRESS = "0x066604cab8d009317131f7282b1c875311a41e3cac91af22858a92a0ddcfa0";
const STAKE_AMOUNT_SATS = 10000n; // 10,000 satoshis

export function useWBTCContracts(account: Account | null) {
  const { setError, setIsLoading } = useGameStore();
  const [isApproving, setIsApproving] = useState(false);

  /**
   * Approve escrow contract to spend WBTC
   */
  const approveWBTC = async () => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsApproving(true);
      setError(null);
      console.log(`💰 Approving escrow to spend ${STAKE_AMOUNT_SATS} sats...`);

      const tx = await account.execute({
        contractAddress: MOCK_WBTC_ADDRESS,
        entrypoint: "approve",
        calldata: [
          CONTRACTS.escrow.address, // spender (escrow contract)
          STAKE_AMOUNT_SATS.toString(), // amount (u256 low)
          "0", // amount (u256 high)
        ],
      });

      console.log("📤 Approval transaction sent:", tx.transaction_hash);
      await account.waitForTransaction(tx.transaction_hash, {
        retryInterval: 1000,
      });

      console.log("✅ WBTC approval successful!");
      return tx.transaction_hash;
    } catch (err: any) {
      console.error("❌ Failed to approve WBTC:", err);
      setError(err.message || "Failed to approve WBTC");
      throw err;
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Check WBTC allowance for escrow contract
   */
  const checkAllowance = async (): Promise<bigint> => {
    if (!account) return 0n;

    try {
      const result = await account.callContract({
        contractAddress: MOCK_WBTC_ADDRESS,
        entrypoint: "allowance",
        calldata: [
          account.address, // owner
          CONTRACTS.escrow.address, // spender
        ],
      });

      // Result is [low, high] for u256
      const allowance = BigInt(result[0]);
      console.log(`🔍 Current WBTC allowance: ${allowance} sats`);
      return allowance;
    } catch (err: any) {
      console.error("❌ Failed to check allowance:", err);
      return 0n;
    }
  };

  /**
   * Check WBTC balance
   */
  const checkBalance = async (): Promise<bigint> => {
    if (!account) return 0n;

    try {
      const result = await account.callContract({
        contractAddress: MOCK_WBTC_ADDRESS,
        entrypoint: "balance_of",
        calldata: [account.address],
      });

      // Result is [low, high] for u256
      const balance = BigInt(result[0]);
      console.log(`🔍 WBTC balance: ${balance} sats`);
      return balance;
    } catch (err: any) {
      console.error("❌ Failed to check balance:", err);
      return 0n;
    }
  };

  return {
    approveWBTC,
    checkAllowance,
    checkBalance,
    isApproving,
    STAKE_AMOUNT_SATS,
    MOCK_WBTC_ADDRESS,
  };
}

