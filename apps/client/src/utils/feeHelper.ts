/**
 * Fee Helper for Starknet V3 Transactions
 * 
 * V3 transactions on Starknet mainnet use resource bounds + tips (EIP-1559-style)
 * instead of the legacy maxFee approach.
 * 
 * Reference: https://docs.starknet.io/resources/transactions-reference
 */

import { Call } from "starknet";
import type { Account } from "@cartridge/controller";

export interface V3FeeDetails {
  resourceBounds: {
    l1_gas: { max_amount: string; max_price_per_unit: string };
    l1_data_gas: { max_amount: string; max_price_per_unit: string }; // CRITICAL for token ops!
    l2_gas: { max_amount: string; max_price_per_unit: string };
  };
  tip: string;
  nonce?: string;
}

interface EstimateFeeResponse {
  overall_fee: string;
  gas_consumed?: string;
  gas_price?: string;
  data_gas_consumed?: string;
  data_gas_price?: string;
}

/**
 * Prepare V3 fee details for a transaction
 * 
 * @param account - Starknet account
 * @param calls - Transaction calls to estimate
 * @param tipPercent - Tip as percentage of base fee (default 10%)
 * @param l1GasMultiplier - L1 gas overhead multiplier (default 150%)
 * @param l2GasMultiplier - L2 gas overhead multiplier (default 150%)
 * @returns Fee details ready for account.execute()
 */
export async function prepareV3Fees(
  account: Account,
  calls: Call | Call[],
  options: {
    tipPercent?: number;
    l1GasMultiplier?: number;
    l2GasMultiplier?: number;
    lockNonce?: boolean;
  } = {}
): Promise<V3FeeDetails> {
  const {
    tipPercent = 10,
    l1GasMultiplier = 150,
    l2GasMultiplier = 150,
    lockNonce = false,
  } = options;

  console.log("⛽ Estimating V3 fees...");

  // 1. Estimate fees (with fallback for undeployed accounts)
  const callsArray = Array.isArray(calls) ? calls : [calls];
  let estimate: any;
  let isUndeployedAccount = false;

  try {
    estimate = await account.estimateInvokeFee(callsArray);
    console.log(`   Estimated fee: ${estimate.overall_fee} FRI`);
  } catch (error: any) {
    // If account is not deployed, fee estimation will fail with "Contract not found"
    // In this case, use generous default fees that will cover deployment + transaction
    if (error.message?.includes("Contract not found") || error.message?.includes("not deployed")) {
      console.log("   ⚠️  Account not deployed - using default fees for deployment");
      isUndeployedAccount = true;
      estimate = {
        overall_fee: "100000000000000", // 0.0001 STRK (generous for deployment + tx)
        gas_consumed: "100000",
        data_gas_consumed: "10000",
        gas_price: "100000000000",
        data_gas_price: "10000000000",
      };
    } else {
      throw error; // Re-throw unexpected errors
    }
  }

  // 2. Extract resource usage from estimate
  // V3 estimates return resource breakdown (gas_consumed, data_gas_consumed, etc.)
  const baseFee = BigInt(estimate.overall_fee);
  
  // Parse resource estimates (these come from the RPC estimate response)
  // If not available, use conservative fallbacks
  const l1Gas = BigInt((estimate as any).gas_consumed || "100000");
  const l1DataGas = BigInt((estimate as any).data_gas_consumed || "10000"); // CRITICAL for token ops!
  const l2Gas = BigInt((estimate as any).gas_consumed || "100000");
  
  const l1GasPrice = BigInt((estimate as any).gas_price || "100000000000"); // ~100 gwei in FRI
  const l1DataGasPrice = BigInt((estimate as any).data_gas_price || "10000000000"); // ~10 gwei in FRI
  const l2GasPrice = BigInt((estimate as any).gas_price || "1000000000"); // ~1 gwei in FRI
  
  // Apply GENEROUS multipliers (150% = 1.5x) to avoid TTL eviction
  const resourceBounds = {
    l1_gas: {
      max_amount: ((l1Gas * BigInt(l1GasMultiplier)) / 100n).toString(),
      max_price_per_unit: ((l1GasPrice * 150n) / 100n).toString(), // 50% price headroom
    },
    l1_data_gas: {
      // THIS IS THE KEY - token operations need L1_DATA_GAS for events/state diffs!
      max_amount: ((l1DataGas * BigInt(l1GasMultiplier)) / 100n).toString(),
      max_price_per_unit: ((l1DataGasPrice * 150n) / 100n).toString(),
    },
    l2_gas: {
      max_amount: ((l2Gas * BigInt(l2GasMultiplier)) / 100n).toString(),
      max_price_per_unit: ((l2GasPrice * 150n) / 100n).toString(),
    },
  };

  // 3. Calculate tip (5-15% of base fee to prioritize in mempool)
  const tip = ((baseFee * BigInt(tipPercent)) / 100n).toString();

  console.log(`   Tip: ${tip} FRI (${tipPercent}% of base fee)`);
  console.log(`   Resource bounds:`, resourceBounds);

  // 4. Optionally lock nonce for parallel tx prevention
  const result: V3FeeDetails = {
    resourceBounds,
    tip,
  };

  if (lockNonce) {
    result.nonce = (await account.getNonce()).toString();
    console.log(`   Nonce locked: ${result.nonce}`);
  }

  return result;
}

/**
 * Retry a transaction with a higher tip (for TTL eviction recovery)
 * 
 * @param account - Starknet account
 * @param calls - Original transaction calls
 * @param originalFees - Original fee details
 * @param tipBumpPercent - How much to increase tip (default 150% = +50%)
 */
export async function retryWithHigherTip(
  account: Account,
  calls: Call | Call[],
  originalFees: V3FeeDetails,
  tipBumpPercent: number = 150
): Promise<any> {
  console.log(`🔄 Retrying with ${tipBumpPercent}% tip...`);

  const higherTip = ((BigInt(originalFees.tip) * BigInt(tipBumpPercent)) / 100n).toString();

  const callsArray = Array.isArray(calls) ? calls : [calls];

  return account.execute(callsArray, undefined, {
    resourceBounds: originalFees.resourceBounds,
    tip: higherTip,
    nonce: originalFees.nonce, // Same nonce = replace original tx
  });
}

