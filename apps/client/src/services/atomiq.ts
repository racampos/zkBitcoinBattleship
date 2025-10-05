// Atomiq swap service for BTC ↔ STRK swaps
// Browser-optimized configuration (NodeJS example uses RpcProvider object)

import { SwapperFactory, type Swap, BitcoinNetwork } from "@atomiqlabs/sdk";
import { StarknetInitializer } from "@atomiqlabs/chain-starknet";
import { RpcProvider } from "starknet";
import type { Account } from "starknet";
import type {
  SwapQuote,
  SwapDirection,
  SwapMonitorCallbacks,
} from "./types/swap.types";

export class AtomiqService {
  private static instance: AtomiqService;
  private factory: typeof SwapperFactory.prototype | null = null;
  private swapper: ReturnType<
    typeof SwapperFactory.prototype.newSwapper
  > | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): AtomiqService {
    if (!AtomiqService.instance) {
      AtomiqService.instance = new AtomiqService();
    }
    return AtomiqService.instance;
  }

  /**
   * Initialize Atomiq SDK
   * BROWSER MODE: Let SDK create RpcProvider internally
   */
  async initialize() {
    if (this.initialized) return;

    console.log("🔧 Initializing Atomiq SDK (browser mode)...");

    const Factory = new SwapperFactory([StarknetInitializer] as const);
    this.factory = Factory;

    const bitcoinNetwork =
      import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
        ? BitcoinNetwork.MAINNET
        : BitcoinNetwork.TESTNET;

    console.log("  Bitcoin Network:", bitcoinNetwork);
    console.log("  Starknet RPC:", import.meta.env.VITE_STARKNET_RPC_URL);

    // Create RpcProvider like official example (lines 60-62)
    const starknetRpc = new RpcProvider({
      nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL,
    });
    
    console.log("  Created RpcProvider");

    try {
      // Pass RpcProvider object like official example (line 113)
      this.swapper = Factory.newSwapper({
        chains: {
          STARKNET: {
            rpcUrl: starknetRpc, // ← RpcProvider object, not string!
          },
        },
        bitcoinNetwork,
      });

      console.log("  Swapper created, calling init()...");

      // CRITICAL: Initialize swapper (from official example line 131)
      await this.swapper.init();

      this.initialized = true;
      console.log("✅ Atomiq SDK initialized successfully");
    } catch (error: any) {
      console.error("❌ SDK initialization failed:", error);
      console.error("  Stack:", error.stack);
      throw error;
    }
  }

  /**
   * Get swap quote
   */
  async getQuote(direction: SwapDirection, amount: bigint): Promise<SwapQuote> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const fromToken =
      direction === "btc_to_strk"
        ? (this.factory as any).Tokens.BITCOIN.BTCLN // Lightning Network
        : (this.factory as any).Tokens.STARKNET.STRK;

    const toToken =
      direction === "btc_to_strk"
        ? (this.factory as any).Tokens.STARKNET.STRK
        : (this.factory as any).Tokens.BITCOIN.BTCLN;

    // Dummy Starknet address for quote (will be replaced with real address during actual swap)
    const DUMMY_STARKNET_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";

    // Get swap preview
    const swap = await this.swapper.swap(
      fromToken,
      toToken,
      amount,
      true, // exactIn
      undefined, // source address (not needed for Lightning quotes)
      direction === "btc_to_strk" ? DUMMY_STARKNET_ADDRESS : undefined // dest address required for BTC->STRK
    );

    // Extract swap details - returns objects with rawAmount property
    const inputData = swap.getInput();   // {rawAmount: 10000n, amount: '0.00010000', ...}
    const outputData = swap.getOutput(); // {rawAmount: 81889376020138340590n, ...}
    
    console.log("🔍 Debug - Raw SDK Response:");
    console.log("  Input:", inputData);
    console.log("  Output:", outputData);
    
    // Get fee breakdown (official example line 203-205)
    const feeBreakdown = swap.getFeeBreakdown();
    console.log("  Fee breakdown:", feeBreakdown);
    
    // Fee structure: feeItem.fee.amountInSrcToken.rawAmount
    const totalFee = feeBreakdown.reduce((sum, feeItem) => {
      return sum + (feeItem.fee.amountInSrcToken as any).rawAmount;
    }, 0n);

    // Use rawAmount directly - it's already a bigint!
    const inputAmount = (inputData as any).rawAmount;
    const outputAmount = (outputData as any).rawAmount;

    console.log("📊 Quote Details:");
    console.log("  Input (raw):", inputAmount.toString());
    console.log("  Output (raw):", outputAmount.toString());
    console.log("  Fee (raw):", totalFee.toString());

    // Calculate rate: STRK per sat (accounting for decimals)
    // For BTC -> STRK:
    //   inputAmount is in sats (base unit, no decimals)
    //   outputAmount is in wei (18 decimals)
    //   rate = (outputAmount / 10^18) / inputAmount = outputAmount / (inputAmount * 10^18)
    const rate = direction === "btc_to_strk"
      ? Number(outputAmount) / Number(inputAmount) / 1e18  // STRK/sat
      : Number(outputAmount) / Number(inputAmount) * 1e18; // sats/STRK

    console.log("  Rate:", rate.toFixed(10), direction === "btc_to_strk" ? "STRK/sat" : "sats/STRK");

    return {
      direction,
      inputAmount: inputAmount,
      outputAmount: outputAmount,
      fromAmount: inputAmount, // Alias for demo compatibility
      toAmount: outputAmount, // Alias for demo compatibility
      inputToken: fromToken.symbol,
      outputToken: toToken.symbol,
      rate: rate,
      fee: totalFee,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      minOutput: 0n, // SDK doesn't expose this in simple mode
      maxInput: BigInt(Number.MAX_SAFE_INTEGER),
    } as SwapQuote;
  }

  /**
   * Create Lightning deposit swap (BTC → STRK)
   */
  async createDepositSwap(
    amount: bigint,
    starknetAddress: string,
    callbacks?: SwapMonitorCallbacks
  ): Promise<Swap> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const fromToken = (this.factory as any).Tokens.BITCOIN.BTCLN;
    const toToken = (this.factory as any).Tokens.STARKNET.STRK;

    // Create swap
    const swap = await this.swapper.swap(
      fromToken,
      toToken,
      amount,
      true, // exactIn
      undefined, // BTC source (Lightning invoice will be generated)
      starknetAddress // Starknet destination
    );

    // Monitor payment
    if (callbacks?.onPaymentReceived) {
      swap.waitForPayment().then((paid) => {
        if (paid && callbacks.onPaymentReceived) {
          callbacks.onPaymentReceived();
        }
      });
    }

    return swap;
  }

  /**
   * Create Lightning withdrawal swap (STRK → BTC)
   */
  async createWithdrawalSwap(
    amount: bigint,
    starknetAccount: Account,
    lightningInvoice: string,
    callbacks?: SwapMonitorCallbacks
  ): Promise<Swap> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const fromToken = (this.factory as any).Tokens.STARKNET.STRK;
    const toToken = (this.factory as any).Tokens.BITCOIN.BTCLN;

    // Create swap
    const swap = await this.swapper.swap(
      fromToken,
      toToken,
      amount,
      true, // exactIn
      starknetAccount.address, // Starknet source
      lightningInvoice // Lightning destination
    );

    // Commit the swap on Starknet
    const commitTx = await swap.commit(starknetAccount);
    console.log("Starknet commit transaction:", commitTx);

    // Monitor payout
    if (callbacks?.onPaymentReceived) {
      swap.waitForPayment().then((paid) => {
        if (paid && callbacks.onPaymentReceived) {
          callbacks.onPaymentReceived();
        }
      });
    }

    return swap;
  }

  /**
   * Get the Lightning invoice for a BTC deposit
   */
  getInvoice(swap: Swap): string | null {
    try {
      return swap.getAddress(); // For Lightning, this returns the invoice
    } catch (error) {
      console.error("Failed to get invoice:", error);
      return null;
    }
  }

  /**
   * Wait for Bitcoin payment
   */
  async waitForPayment(swap: Swap, timeoutMs: number = 600000): Promise<boolean> {
    try {
      return await swap.waitForPayment(timeoutMs);
    } catch (error) {
      console.error("Payment wait failed:", error);
      return false;
    }
  }

  /**
   * Claim swap on Starknet after Bitcoin payment received
   */
  async claimSwap(swap: Swap, starknetAccount: Account): Promise<string> {
    const tx = await swap.claim(starknetAccount);
    console.log("Claim transaction:", tx);
    return tx as string;
  }

  /**
   * Refund swap if expired
   */
  async refundSwap(swap: Swap, starknetAccount: Account): Promise<string> {
    const tx = await swap.refund(starknetAccount);
    console.log("Refund transaction:", tx);
    return tx as string;
  }

  /**
   * Get swap status
   */
  getSwapStatus(swap: Swap): string {
    return swap.state || "unknown";
  }
}
