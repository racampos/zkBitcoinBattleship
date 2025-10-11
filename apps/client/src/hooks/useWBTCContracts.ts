/**
 * Hook for interacting with WBTC ERC20 contract
 * Handles approve and balance queries for staking
 */

import { useState } from "react";
import { Account } from "@cartridge/controller";
import { useGameStore } from "../store/gameStore";
import { CONTRACTS } from "../dojo/config";
import { prepareV3Fees } from "../utils/feeHelper";

// WBTC address - environment aware
const isMainnet = import.meta.env.VITE_STARKNET_RPC_URL?.includes('mainnet');
const WBTC_ADDRESS = isMainnet 
  ? "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac" // Real WBTC on Mainnet
  : "0x0496bef3ed20371382fbe0ca6a5a64252c5c848f9f1f0cccf8110fc4def912d5"; // WBTC on Sepolia (Atomiq-compatible)

const STAKE_AMOUNT_SATS = 1000n; // 1,000 satoshis (~$1 USD)

console.log(`🪙 WBTC Address (${isMainnet ? 'MAINNET' : 'SEPOLIA'}):`, WBTC_ADDRESS);

export function useWBTCContracts(account: Account | null) {
  const { setError, setIsLoading } = useGameStore();
  const [isApproving, setIsApproving] = useState(false);

  /**
   * Approve escrow contract to spend WBTC
   */
  const approveWBTC = async (amount: bigint = STAKE_AMOUNT_SATS) => {
    if (!account) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsApproving(true);
      setError(null);
      console.log(`💰 Approving escrow to spend ${amount} sats...`);

      // ERC20 operations need explicit V3 fees with L1_DATA_GAS bounds
      const calls = {
        contractAddress: WBTC_ADDRESS,
        entrypoint: "approve",
        calldata: [
          CONTRACTS.escrow.address, // spender (escrow contract)
          amount.toString(), // amount (u256 low)
          "0", // amount (u256 high)
        ],
      };

      const feeDetails = await prepareV3Fees(account, calls, {
        tipPercent: 50, // 50% tip to prioritize (was 20%)
        l1GasMultiplier: 300, // 3x headroom (was 2x)
        l2GasMultiplier: 300, // 3x headroom (was 2x)
        lockNonce: true,
      });

      const tx = await account.execute(calls, undefined, feeDetails);

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
        contractAddress: WBTC_ADDRESS,
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
        contractAddress: WBTC_ADDRESS,
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
    WBTC_ADDRESS,
  };
}

