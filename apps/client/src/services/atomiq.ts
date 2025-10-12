// Atomiq swap service for BTC ↔ STRK swaps
// Browser-optimized configuration (NodeJS example uses RpcProvider object)

import { SwapperFactory, type ISwap, BitcoinNetwork } from "@atomiqlabs/sdk";
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
    
    // Debug environment variables
    console.log("  🔍 Debug - VITE_BITCOIN_NETWORK env var:", import.meta.env.VITE_BITCOIN_NETWORK);
    console.log("  🔍 Debug - BitcoinNetwork.MAINNET value:", BitcoinNetwork.MAINNET);
    console.log("  🔍 Debug - BitcoinNetwork.TESTNET value:", BitcoinNetwork.TESTNET);

    const Factory = new SwapperFactory([StarknetInitializer] as const);
    this.factory = Factory;

    // Force TESTNET for now since env var might not be working
    const envValue = import.meta.env.VITE_BITCOIN_NETWORK;
    const bitcoinNetwork = envValue === "mainnet" 
      ? BitcoinNetwork.MAINNET 
      : BitcoinNetwork.TESTNET;

    console.log("  ✅ Selected Bitcoin Network:", bitcoinNetwork, envValue === "mainnet" ? "(MAINNET)" : "(TESTNET)");
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
   * Create Lightning deposit swap (BTC-LN → WBTC on Starknet)
   * For mainnet, we swap to WBTC to keep UX "Bitcoin-native"
   */
  async createDepositSwap(
    amount: bigint,
    starknetAddress: string,
    callbacks?: SwapMonitorCallbacks
  ): Promise<any> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const fromToken = (this.factory as any).Tokens.BITCOIN.BTCLN; // Lightning Network
    
    // Use WBTC on Starknet for mainnet (Bitcoin-native UX)
    // Check if WBTC token is available, otherwise fall back to STRK
    const toToken = (this.factory as any).Tokens.STARKNET.WBTC || (this.factory as any).Tokens.STARKNET.STRK;
    
    console.log("🔄 Creating Lightning swap:", {
      from: fromToken.symbol,
      to: toToken.symbol,
      amount: amount.toString(),
      destination: starknetAddress
    });

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
   * Create on-chain Bitcoin deposit swap (BTC → STRK)
   * Official example lines 135-142
   */
  async createOnChainDepositSwap(
    amount: bigint,
    bitcoinAddress: string,
    starknetAddress: string
  ): Promise<any> {
    await this.initialize();
    if (!this.swapper || !this.factory) {
      throw new Error("Atomiq SDK not initialized");
    }

    const fromToken = (this.factory as any).Tokens.BITCOIN.BTC; // On-chain BTC
    
    // Atomiq SDK has TWO different WBTC tokens:
    // - WBTC: Mainnet WBTC (0x03fe...)
    // - _TESTNET_WBTC_VESU: Sepolia testnet WBTC (0x0486...)
    // We must use the correct token IDENTIFIER, not just hardcode addresses!
    const isMainnet = import.meta.env.VITE_STARKNET_RPC_URL?.includes('mainnet');
    const toToken = isMainnet
      ? (this.factory as any).Tokens.STARKNET.WBTC
      : (this.factory as any).Tokens.STARKNET._TESTNET_WBTC_VESU;

    console.log("🔄 Creating on-chain BTC → WBTC swap:", {
      from: fromToken.symbol,
      to: toToken.symbol,
      network: isMainnet ? 'MAINNET' : 'SEPOLIA TESTNET',
      amount: amount.toString(),
      btcSource: bitcoinAddress,
      starknetDest: starknetAddress
    });

    // Create swap (line 135-142 from official example)
    const swap = await this.swapper.swap(
      fromToken,
      toToken,
      amount,
      true, // exactIn
      bitcoinAddress, // Source Bitcoin address
      starknetAddress // Destination Starknet address
    );

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
  ): Promise<any> {
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
  getInvoice(swap: any): string | null {
    try {
      return swap.getAddress(); // For Lightning, this returns the invoice
    } catch (error) {
      console.error("Failed to get invoice:", error);
      return null;
    }
  }

  /**
   * Wait for Bitcoin payment with timeout
   */
  async waitForPayment(swap: any, timeoutMs: number = 600000): Promise<boolean> {
    try {
      // Use Promise.race to implement timeout
      const paymentPromise = swap.waitForPayment();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log('⏱️ Payment wait timed out after', timeoutMs, 'ms');
          resolve(false);
        }, timeoutMs);
      });
      
      const result = await Promise.race([paymentPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error("❌ Payment wait failed:", error);
      return false;
    }
  }

  /**
   * Create a minimal ethers.js-like signer for Atomiq SDK
   * This avoids property conflicts by NOT spreading the Cartridge Account
   */
  private createSignerAdapter(starknetAccount: Account): any {
    console.log("🔧 Creating signer adapter for account:", starknetAccount.address);
    
    // Create a clean object with ONLY the properties Atomiq needs
    // Don't spread starknetAccount to avoid property conflicts
    const adapter = {
      // Core ethers.js Signer interface
      address: starknetAccount.address,
      _isSigner: true,
      
      getAddress: async () => {
        console.log("📍 getAddress() called, returning:", starknetAccount.address);
        return starknetAccount.address;
      },
      
      // connect() is a standard ethers.js Signer method
      connect: (provider: any) => {
        console.log("🔗 connect() called with provider:", provider);
        return adapter; // Return self
      },
      
      // Provider is needed for Atomiq
      provider: starknetAccount, // Use the actual Starknet account as provider
      
      // Starknet-specific methods that Atomiq will actually use
      execute: starknetAccount.execute.bind(starknetAccount),
      callContract: starknetAccount.callContract.bind(starknetAccount),
      waitForTransaction: starknetAccount.waitForTransaction.bind(starknetAccount),
      
      // Additional signing methods (might not be called)
      signMessage: async (message: any) => {
        console.log("📝 signMessage() called with:", message);
        return starknetAccount.address;
      },
      signTransaction: async (tx: any) => {
        console.log("✍️ signTransaction() called with:", tx);
        return starknetAccount.address;
      },
    };
    
    console.log("✅ Minimal signer adapter created with keys:", Object.keys(adapter));
    return adapter;
  }

  /**
   * Commit swap using transaction builder (bypasses signer validation)
   * This works with ANY Starknet account that can execute transactions
   */
  async commitSwap(swap: any, starknetAccount: Account): Promise<void> {
    console.log("📝 Building commit transactions...");
    
    // Use txsCommit() to build transactions without signer validation
    const commitTxs = await swap.txsCommit(true); // skipChecks = true
    console.log("📦 Commit transactions built:", commitTxs);
    
    // Extract just the calls (tx array) from the first transaction
    // Cartridge will handle nonce, fees, and other details
    const calls = commitTxs[0].tx;
    console.log("📦 Extracted calls:", calls);
    
    // Execute with Cartridge account (let it handle nonce & fees)
    console.log("📤 Sending commit transaction...");
    const result = await starknetAccount.execute(calls);
    console.log("📤 Commit transaction sent:", result.transaction_hash);
    
    // Wait for confirmation
    await starknetAccount.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000,
    });
    console.log("✅ Commit transaction confirmed");
    
    // Wait for Atomiq to detect the on-chain commit
    console.log("⏳ Waiting for Atomiq to detect commit...");
    await swap.waitTillCommited();
    console.log("✅ Swap committed and detected by Atomiq");
  }

  /**
   * Claim swap using transaction builder (bypasses signer validation)
   */
  async claimSwap(swap: any, starknetAccount: Account): Promise<string> {
    console.log("💰 Building claim transactions...");
    
    // Use txsClaim() to build transactions without signer
    const claimTxs = await swap.txsClaim();
    console.log("📦 Claim transactions built:", claimTxs);
    
    // Extract just the calls (tx array) from the first transaction
    // Cartridge will handle nonce, fees, and other details
    const calls = claimTxs[0].tx;
    console.log("📦 Extracted calls:", calls);
    
    // Execute with Cartridge account (let it handle nonce & fees)
    console.log("📤 Sending claim transaction...");
    const result = await starknetAccount.execute(calls);
    console.log("📤 Claim transaction sent:", result.transaction_hash);
    
    // Wait for confirmation
    await starknetAccount.waitForTransaction(result.transaction_hash, {
      retryInterval: 1000,
    });
    console.log("✅ Claim transaction confirmed");
    
    // Wait for Atomiq to detect the claim
    console.log("⏳ Waiting for Atomiq to detect claim...");
    await swap.waitTillClaimed();
    console.log("✅ Swap claimed successfully");
    
    return result.transaction_hash;
  }

  /**
   * Refund swap if expired
   */
  async refundSwap(swap: any, starknetAccount: Account): Promise<string> {
    const signer = this.createSignerAdapter(starknetAccount);
    const tx = await swap.refund(signer);
    console.log("Refund transaction:", tx);
    return tx as string;
  }

  /**
   * Get swap status
   */
  getSwapStatus(swap: any): string {
    return String(swap.state || "unknown");
  }
}
