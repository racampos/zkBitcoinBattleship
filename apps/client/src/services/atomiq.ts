// Atomiq swap service for BTC ↔ STRK swaps

import { SwapperFactory, type Swap, BitcoinNetwork } from "@atomiqlabs/sdk";
import { StarknetInitializer } from "@atomiqlabs/chain-starknet";
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
   */
  async initialize() {
    if (this.initialized) return;

    const Factory = new SwapperFactory([StarknetInitializer] as const);
    this.factory = Factory;

    const bitcoinNetwork =
      import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
        ? BitcoinNetwork.MAINNET
        : BitcoinNetwork.TESTNET;

    this.swapper = Factory.newSwapper({
      chains: {
        STARKNET: {
          rpcUrl: import.meta.env.VITE_STARKNET_RPC_URL,
        },
      },
      bitcoinNetwork,
    });

    this.initialized = true;
    console.log("Atomiq SDK initialized:", { bitcoinNetwork });
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
        ? this.factory.Tokens.BITCOIN.BTCLN // Lightning Network
        : this.factory.Tokens.STARKNET.STRK;

    const toToken =
      direction === "btc_to_strk"
        ? this.factory.Tokens.STARKNET.STRK
        : this.factory.Tokens.BITCOIN.BTCLN;

    // Get swap preview
    const swap = await this.swapper.swap(
      fromToken,
      toToken,
      amount,
      true, // exactIn
      undefined, // source address (not needed for Lightning)
      undefined // dest address (will be provided later)
    );

    const priceInfo = swap.getPriceInfo();
    const fee = swap.getFee();

    return {
      direction,
      inputAmount: amount,
      outputAmount: priceInfo.output,
      inputToken: fromToken.symbol,
      outputToken: toToken.symbol,
      rate: Number(priceInfo.output) / Number(amount),
      fee: fee,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      minOutput: priceInfo.minOutput || 0n,
      maxInput: priceInfo.maxInput || BigInt(Number.MAX_SAFE_INTEGER),
    };
  }

  /**
   * Create Lightning deposit swap (BTC → STRK)
   */
  async createDepositSwap(
    amount: bigint,
    starknetAddress: string
  ): Promise<{ swap: Swap; invoice: string; qrData: string }> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const swap = await this.swapper.swap(
      this.factory.Tokens.BITCOIN.BTCLN,
      this.factory.Tokens.STARKNET.STRK,
      amount,
      true,
      undefined,
      starknetAddress
    );

    const invoice = swap.getAddress(); // BOLT11 invoice
    const qrData = swap.getHyperlink(); // QR-friendly format

    return { swap, invoice, qrData };
  }

  /**
   * Create Lightning withdrawal swap (STRK → BTC)
   */
  async createWithdrawalSwap(
    amount: bigint,
    lightningAddress: string,
    starknetAccount: Account
  ): Promise<Swap> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const swap = await this.swapper.swap(
      this.factory.Tokens.STARKNET.STRK,
      this.factory.Tokens.BITCOIN.BTCLN,
      amount,
      true,
      undefined,
      lightningAddress
    );

    // Commit STRK to Atomiq vault on Starknet
    await swap.commit(starknetAccount);

    return swap;
  }

  /**
   * Monitor Lightning payment
   */
  async waitForPayment(
    swap: Swap,
    callbacks?: SwapMonitorCallbacks
  ): Promise<boolean> {
    try {
      callbacks?.onStatusChange?.("awaiting_payment" as any);

      const paid = await swap.waitForPayment();

      if (paid) {
        callbacks?.onPaymentReceived?.();
        return true;
      } else {
        callbacks?.onError?.(
          new Error("Payment not received before expiration")
        );
        return false;
      }
    } catch (error) {
      callbacks?.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Claim funds on Starknet after payment
   */
  async claimFunds(
    swap: Swap,
    starknetAccount: Account,
    callbacks?: SwapMonitorCallbacks
  ): Promise<boolean> {
    try {
      callbacks?.onStatusChange?.("claiming" as any);

      // Wait for auto-claim or manually claim
      try {
        const timeoutSignal = AbortSignal.timeout(30000); // 30 seconds
        await swap.waitTillClaimedOrFronted(timeoutSignal);
      } catch {
        // Auto-claim didn't happen, manually claim
        await swap.claim(starknetAccount);
      }

      callbacks?.onClaimed?.();
      return true;
    } catch (error) {
      callbacks?.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Monitor withdrawal (Starknet tx → Bitcoin payout)
   */
  async waitForWithdrawal(
    swap: Swap,
    callbacks?: SwapMonitorCallbacks
  ): Promise<boolean> {
    try {
      // Wait for Starknet tx to be confirmed (commit phase)
      callbacks?.onStatusChange?.("committing" as any);
      // SDK handles this internally after commit()

      // Wait for Bitcoin Lightning payout
      callbacks?.onStatusChange?.("awaiting_payment" as any);
      const paid = await swap.waitForPayment();

      if (paid) {
        callbacks?.onClaimed?.();
        return true;
      } else {
        callbacks?.onError?.(new Error("Bitcoin payout failed"));
        return false;
      }
    } catch (error) {
      callbacks?.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Get swap status
   */
  getSwapStatus(swap: Swap): string {
    // SDK provides swap.state enum
    return swap.state || "unknown";
  }

  /**
   * Refund swap if something went wrong
   */
  async refundSwap(swap: Swap, account: Account): Promise<boolean> {
    try {
      await swap.refund(account);
      return true;
    } catch (error) {
      console.error("Refund failed:", error);
      return false;
    }
  }
}

