# Bitcoin Integration Plan - Xverse + Atomiq

> Comprehensive implementation plan for trustless Bitcoin ↔ Starknet integration in BitcoinShip

**Status:** Ready to implement  
**Timeline:** 2-3 days with AI-assisted development  
**Scope:** Full bidirectional Lightning swaps (BTC → STRK deposits, STRK → BTC withdrawals)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Implementation Phases](#implementation-phases)
4. [File Structure](#file-structure)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Error Handling](#error-handling)
8. [UX Considerations](#ux-considerations)

---

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Xverse Connect   │  │  Deposit Flow    │  │ Withdraw Flow│  │
│  │  Button          │  │  (BTC → STRK)    │  │ (STRK → BTC) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────┼─────────────────────┼────────────────────┼──────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ XverseService    │  │  AtomiqService   │  │ WalletStore  │  │
│  │ - Connect        │  │  - Swap          │  │ - State Mgmt │  │
│  │ - SignMessage    │  │  - Quote         │  │ - Balances   │  │
│  │ - GetAddresses   │  │  - Monitor       │  │              │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────┼─────────────────────┼────────────────────┼──────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External Systems                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Xverse Wallet    │  │  Atomiq Network  │  │   Starknet   │  │
│  │ (Sats Connect)   │  │  (LP Nodes)      │  │   (Sepolia)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow - Deposit (BTC → STRK)

```
1. User clicks "Deposit BTC"
2. XverseService.connect() → Get BTC address
3. AtomiqService.getQuote(BTC, STRK, amount) → Display quote
4. User confirms → AtomiqService.createSwap() → Get Lightning invoice
5. Display QR code + invoice string
6. User pays from Xverse (or any LN wallet)
7. AtomiqService.waitForPayment() → Polls until paid
8. AtomiqService.claimFunds() → STRK appears in Starknet wallet
9. Update UI → Show success + new balance
```

### Data Flow - Withdrawal (STRK → BTC)

```
1. User clicks "Withdraw to BTC"
2. User enters BTC Lightning address (or generates invoice)
3. AtomiqService.getQuote(STRK, BTC, amount) → Display quote
4. User confirms → AtomiqService.createSwap()
5. AtomiqService.commitSwap(starknetSigner) → Lock STRK on Starknet
6. Monitor Starknet tx confirmation
7. Atomiq LP pays Lightning invoice
8. AtomiqService.waitForBitcoinPayout() → Polls until complete
9. Update UI → Show success, user receives BTC
```

---

## Technology Stack

### Dependencies to Install

```json
{
  "dependencies": {
    "@atomiqlabs/sdk": "latest",
    "@atomiqlabs/chain-starknet": "latest",
    "sats-connect": "^2.5.0",
    "qrcode.react": "^3.1.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/qrcode.react": "^1.0.2"
  }
}
```

### Versions & Compatibility

- **Atomiq SDK:** Uses TypeScript, supports Starknet Sepolia + Bitcoin testnet
- **Sats Connect:** Xverse wallet integration library
- **Starknet.js:** Already in project (for Cartridge Controller)
- **Bitcoin Network:** Testnet3 (for demo), mainnet-ready architecture

---

## Implementation Phases

### Phase 1: Infrastructure Setup (3-4 hours)

- Install dependencies
- Create service layer architecture
- Set up environment variables
- Create type definitions

### Phase 2: Xverse Integration (4-6 hours)

- Wallet connection flow
- BTC address management
- Message signing for identity binding
- State management

### Phase 3: Atomiq SDK Setup (2-3 hours)

- Initialize swapper factory
- Configure for testnet
- Create swap service abstraction
- Error handling framework

### Phase 4: Deposit Flow (6-8 hours)

- Quote UI
- Lightning invoice generation
- QR code display
- Payment monitoring
- Fund claiming
- Success feedback

### Phase 5: Withdrawal Flow (6-8 hours)

- Amount input
- Lightning address validation
- Swap commit on Starknet
- Payout monitoring
- Success feedback

### Phase 6: Integration & Polish (4-6 hours)

- Connect to game escrow flow
- Balance display
- Transaction history
- Error states
- Loading states

### Phase 7: Testing (8-12 hours)

- Testnet Lightning testing
- Edge case handling
- Timeout scenarios
- Refund flows
- End-to-end testing

**Total Estimated Time:** 33-47 hours (1.5-2 days of AI-assisted development)

---

## File Structure

```
apps/client/
├── src/
│   ├── services/
│   │   ├── xverse.ts              # Xverse wallet integration
│   │   ├── atomiq.ts              # Atomiq swap service
│   │   ├── btc-integration.ts     # High-level BTC operations
│   │   └── types/
│   │       ├── bitcoin.types.ts   # BTC-related types
│   │       └── swap.types.ts      # Atomiq swap types
│   │
│   ├── store/
│   │   ├── btcWalletStore.ts      # Bitcoin wallet state (Zustand)
│   │   └── swapStore.ts           # Swap transaction state
│   │
│   ├── components/
│   │   ├── bitcoin/
│   │   │   ├── XverseConnectButton.tsx
│   │   │   ├── DepositModal.tsx
│   │   │   ├── WithdrawModal.tsx
│   │   │   ├── SwapQuoteCard.tsx
│   │   │   ├── LightningInvoiceDisplay.tsx
│   │   │   ├── SwapStatusTracker.tsx
│   │   │   ├── BTCBalanceDisplay.tsx
│   │   │   └── TransactionHistory.tsx
│   │   │
│   │   └── ... (existing components)
│   │
│   ├── hooks/
│   │   ├── useBitcoinWallet.ts
│   │   ├── useAtomiqSwap.ts
│   │   └── useSwapMonitoring.ts
│   │
│   └── utils/
│       ├── bitcoin.utils.ts       # BTC formatting, validation
│       ├── lightning.utils.ts     # Invoice parsing, QR generation
│       └── swap.utils.ts          # Swap status helpers
│
├── .env.example
└── package.json
```

---

## Detailed Implementation Steps

### Step 1: Environment Setup

**1.1 Install Dependencies**

```bash
cd apps/client
pnpm add @atomiqlabs/sdk @atomiqlabs/chain-starknet sats-connect qrcode.react
pnpm add -D @types/qrcode.react
```

**1.2 Environment Variables**

Add to `.env`:

```bash
# Starknet (already exists)
VITE_STARKNET_RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR_KEY

# Bitcoin/Atomiq
VITE_BITCOIN_NETWORK=testnet        # testnet | mainnet
VITE_ATOMIQ_ENV=testnet             # testnet | mainnet

# Optional: Bitcoin RPC for on-chain monitoring (not needed for Lightning)
# VITE_BITCOIN_RPC_URL=https://blockstream.info/testnet/api
```

---

### Step 2: Type Definitions

**File:** `apps/client/src/services/types/bitcoin.types.ts`

```typescript
// Bitcoin wallet types
export interface BitcoinAddress {
  address: string;
  publicKey: string;
  purpose: "payment" | "ordinals";
}

export interface XverseConnectResponse {
  addresses: BitcoinAddress[];
}

export enum BitcoinNetworkType {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  TESTNET4 = "testnet4",
  SIGNET = "signet",
}

export interface BitcoinWalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  starknetBinding: string | null; // Starknet address bound to this BTC address
}
```

**File:** `apps/client/src/services/types/swap.types.ts`

```typescript
import type { Swap } from "@atomiqlabs/sdk";

export enum SwapDirection {
  BTC_TO_STRK = "btc_to_strk",
  STRK_TO_BTC = "strk_to_btc",
}

export enum SwapStatus {
  IDLE = "idle",
  QUOTING = "quoting",
  QUOTE_READY = "quote_ready",
  COMMITTING = "committing",
  AWAITING_PAYMENT = "awaiting_payment",
  PAYMENT_RECEIVED = "payment_received",
  CLAIMING = "claiming",
  COMPLETED = "completed",
  FAILED = "failed",
  EXPIRED = "expired",
  REFUNDABLE = "refundable",
}

export interface SwapQuote {
  direction: SwapDirection;
  inputAmount: bigint;
  outputAmount: bigint;
  inputToken: string;
  outputToken: string;
  rate: number;
  fee: bigint;
  expiresAt: number; // timestamp
  minOutput: bigint;
  maxInput: bigint;
}

export interface SwapTransaction {
  id: string;
  direction: SwapDirection;
  status: SwapStatus;
  quote: SwapQuote;
  swap?: Swap; // Atomiq SDK swap object
  lightningInvoice?: string;
  lightningQR?: string;
  txHash?: string; // Starknet tx hash
  bitcoinTxId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SwapMonitorCallbacks {
  onPaymentReceived?: () => void;
  onClaimed?: () => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: SwapStatus) => void;
}
```

---

### Step 3: Xverse Service

**File:** `apps/client/src/services/xverse.ts`

```typescript
import { connect, signMessage, getAddress } from "sats-connect";
import type {
  BitcoinAddress,
  XverseConnectResponse,
} from "./types/bitcoin.types";

export class XverseService {
  private static instance: XverseService;

  private constructor() {}

  static getInstance(): XverseService {
    if (!XverseService.instance) {
      XverseService.instance = new XverseService();
    }
    return XverseService.instance;
  }

  /**
   * Connect to Xverse wallet and get Bitcoin addresses
   */
  async connect(): Promise<XverseConnectResponse> {
    return new Promise((resolve, reject) => {
      connect({
        onFinish: (response) => {
          console.log("Xverse connected:", response);
          resolve(response as XverseConnectResponse);
        },
        onCancel: () => {
          reject(new Error("User cancelled Xverse connection"));
        },
        payload: {
          purposes: ["payment"], // We only need payment address for swaps
          message: "Connect your Bitcoin wallet to BitcoinShip",
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Get current Bitcoin address (if already connected)
   */
  async getAddress(): Promise<BitcoinAddress | null> {
    return new Promise((resolve) => {
      getAddress({
        onFinish: (response) => {
          const paymentAddress = response.addresses.find(
            (addr) => addr.purpose === "payment"
          );
          resolve((paymentAddress as BitcoinAddress) || null);
        },
        onCancel: () => resolve(null),
        payload: {
          purposes: ["payment"],
          message: "Get Bitcoin address",
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Sign a message to bind Bitcoin address to Starknet address
   */
  async bindToStarknet(
    btcAddress: string,
    starknetAddress: string
  ): Promise<string> {
    const message = `Bind Bitcoin address ${btcAddress} to Starknet address ${starknetAddress} for BitcoinShip`;

    return new Promise((resolve, reject) => {
      signMessage({
        onFinish: (response) => {
          console.log("Message signed:", response);
          resolve(response as string);
        },
        onCancel: () => {
          reject(new Error("User cancelled message signing"));
        },
        payload: {
          message,
          address: btcAddress,
          network: {
            type:
              import.meta.env.VITE_BITCOIN_NETWORK === "mainnet"
                ? "Mainnet"
                : "Testnet",
          },
        },
      });
    });
  }

  /**
   * Verify signed message (optional - for server-side verification)
   */
  async verifyBinding(
    btcAddress: string,
    starknetAddress: string,
    signature: string
  ): Promise<boolean> {
    // This would typically be done server-side
    // For now, we just store the binding locally
    const expectedMessage = `Bind Bitcoin address ${btcAddress} to Starknet address ${starknetAddress} for BitcoinShip`;

    // In production, use a Bitcoin signature verification library
    // For demo, we trust the signature since it came from Xverse
    return true;
  }
}
```

---

### Step 4: Atomiq Service

**File:** `apps/client/src/services/atomiq.ts`

```typescript
import { SwapperFactory, type Swap, BitcoinNetwork } from "@atomiqlabs/sdk";
import { StarknetInitializer } from "@atomiqlabs/chain-starknet";
import type { Account } from "starknet";
import type {
  SwapQuote,
  SwapDirection,
  SwapTransaction,
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
      direction === SwapDirection.BTC_TO_STRK
        ? this.factory.Tokens.BITCOIN.BTCLN // Lightning Network
        : this.factory.Tokens.STARKNET.STRK;

    const toToken =
      direction === SwapDirection.BTC_TO_STRK
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
```

---

### Step 5: State Management

**File:** `apps/client/src/store/btcWalletStore.ts`

```typescript
import { create } from "zustand";
import type { BitcoinWalletState } from "../services/types/bitcoin.types";

interface BTCWalletStore extends BitcoinWalletState {
  // Actions
  setConnected: (connected: boolean) => void;
  setAddress: (address: string | null) => void;
  setPublicKey: (publicKey: string | null) => void;
  setStarknetBinding: (starknetAddress: string | null) => void;
  disconnect: () => void;
}

export const useBTCWalletStore = create<BTCWalletStore>((set) => ({
  // Initial state
  connected: false,
  address: null,
  publicKey: null,
  starknetBinding: null,

  // Actions
  setConnected: (connected) => set({ connected }),
  setAddress: (address) => set({ address }),
  setPublicKey: (publicKey) => set({ publicKey }),
  setStarknetBinding: (starknetBinding) => set({ starknetBinding }),
  disconnect: () =>
    set({
      connected: false,
      address: null,
      publicKey: null,
      starknetBinding: null,
    }),
}));
```

**File:** `apps/client/src/store/swapStore.ts`

```typescript
import { create } from "zustand";
import type { SwapTransaction } from "../services/types/swap.types";

interface SwapStore {
  // State
  activeSwap: SwapTransaction | null;
  swapHistory: SwapTransaction[];

  // Actions
  setActiveSwap: (swap: SwapTransaction | null) => void;
  updateActiveSwap: (updates: Partial<SwapTransaction>) => void;
  addToHistory: (swap: SwapTransaction) => void;
  clearActiveSwap: () => void;
}

export const useSwapStore = create<SwapStore>((set) => ({
  // Initial state
  activeSwap: null,
  swapHistory: [],

  // Actions
  setActiveSwap: (swap) => set({ activeSwap: swap }),

  updateActiveSwap: (updates) =>
    set((state) => ({
      activeSwap: state.activeSwap
        ? { ...state.activeSwap, ...updates, updatedAt: Date.now() }
        : null,
    })),

  addToHistory: (swap) =>
    set((state) => ({
      swapHistory: [swap, ...state.swapHistory],
    })),

  clearActiveSwap: () =>
    set((state) => {
      if (state.activeSwap) {
        return {
          activeSwap: null,
          swapHistory: [state.activeSwap, ...state.swapHistory],
        };
      }
      return {};
    }),
}));
```

---

### Step 6: React Hooks

**File:** `apps/client/src/hooks/useBitcoinWallet.ts`

```typescript
import { useCallback } from "react";
import { XverseService } from "../services/xverse";
import { useBTCWalletStore } from "../store/btcWalletStore";
import { useAccount } from "./useAccount"; // Your existing Starknet account hook

export function useBitcoinWallet() {
  const xverseService = XverseService.getInstance();
  const { account: starknetAccount } = useAccount();

  const {
    connected,
    address,
    publicKey,
    starknetBinding,
    setConnected,
    setAddress,
    setPublicKey,
    setStarknetBinding,
    disconnect: disconnectStore,
  } = useBTCWalletStore();

  const connect = useCallback(async () => {
    try {
      const response = await xverseService.connect();
      const paymentAddress = response.addresses.find(
        (addr) => addr.purpose === "payment"
      );

      if (!paymentAddress) {
        throw new Error("No payment address found");
      }

      setConnected(true);
      setAddress(paymentAddress.address);
      setPublicKey(paymentAddress.publicKey);

      // Bind to Starknet address if available
      if (starknetAccount?.address) {
        try {
          const signature = await xverseService.bindToStarknet(
            paymentAddress.address,
            starknetAccount.address
          );
          console.log("Binding signature:", signature);
          setStarknetBinding(starknetAccount.address);
        } catch (error) {
          console.error("Failed to bind addresses:", error);
          // Non-critical, continue anyway
        }
      }

      return paymentAddress.address;
    } catch (error) {
      console.error("Failed to connect Xverse:", error);
      throw error;
    }
  }, [
    starknetAccount,
    setConnected,
    setAddress,
    setPublicKey,
    setStarknetBinding,
  ]);

  const disconnect = useCallback(() => {
    disconnectStore();
  }, [disconnectStore]);

  return {
    connected,
    address,
    publicKey,
    starknetBinding,
    connect,
    disconnect,
  };
}
```

**File:** `apps/client/src/hooks/useAtomiqSwap.ts`

```typescript
import { useCallback } from "react";
import { AtomiqService } from "../services/atomiq";
import { useSwapStore } from "../store/swapStore";
import { useAccount } from "./useAccount";
import type { SwapDirection } from "../services/types/swap.types";
import { SwapStatus } from "../services/types/swap.types";

export function useAtomiqSwap() {
  const atomiqService = AtomiqService.getInstance();
  const { account } = useAccount();
  const { activeSwap, setActiveSwap, updateActiveSwap, clearActiveSwap } =
    useSwapStore();

  const getQuote = useCallback(
    async (direction: SwapDirection, amount: bigint) => {
      try {
        updateActiveSwap?.({ status: SwapStatus.QUOTING });
        const quote = await atomiqService.getQuote(direction, amount);
        return quote;
      } catch (error) {
        console.error("Failed to get quote:", error);
        throw error;
      }
    },
    [atomiqService, updateActiveSwap]
  );

  const startDeposit = useCallback(
    async (amount: bigint, starknetAddress: string) => {
      if (!account) throw new Error("Starknet account not connected");

      try {
        // Get quote first
        const quote = await getQuote(SwapDirection.BTC_TO_STRK, amount);

        // Create swap transaction
        const swapTx = {
          id: `swap-${Date.now()}`,
          direction: SwapDirection.BTC_TO_STRK,
          status: SwapStatus.COMMITTING,
          quote,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setActiveSwap?.(swapTx);

        // Create swap with Atomiq
        const { swap, invoice, qrData } = await atomiqService.createDepositSwap(
          amount,
          starknetAddress
        );

        updateActiveSwap?.({
          swap,
          lightningInvoice: invoice,
          lightningQR: qrData,
          status: SwapStatus.AWAITING_PAYMENT,
        });

        // Monitor payment in background
        const paid = await atomiqService.waitForPayment(swap, {
          onPaymentReceived: () => {
            updateActiveSwap?.({ status: SwapStatus.PAYMENT_RECEIVED });
          },
          onError: (error) => {
            updateActiveSwap?.({
              status: SwapStatus.FAILED,
              error: error.message,
            });
          },
        });

        if (!paid) {
          throw new Error("Payment not received");
        }

        // Claim funds
        updateActiveSwap?.({ status: SwapStatus.CLAIMING });
        await atomiqService.claimFunds(swap, account, {
          onClaimed: () => {
            updateActiveSwap?.({ status: SwapStatus.COMPLETED });
          },
          onError: (error) => {
            updateActiveSwap?.({
              status: SwapStatus.FAILED,
              error: error.message,
            });
          },
        });

        return true;
      } catch (error) {
        console.error("Deposit failed:", error);
        updateActiveSwap?.({
          status: SwapStatus.FAILED,
          error: (error as Error).message,
        });
        throw error;
      }
    },
    [account, atomiqService, getQuote, setActiveSwap, updateActiveSwap]
  );

  const startWithdrawal = useCallback(
    async (amount: bigint, lightningAddress: string) => {
      if (!account) throw new Error("Starknet account not connected");

      try {
        // Get quote first
        const quote = await getQuote(SwapDirection.STRK_TO_BTC, amount);

        // Create swap transaction
        const swapTx = {
          id: `swap-${Date.now()}`,
          direction: SwapDirection.STRK_TO_BTC,
          status: SwapStatus.COMMITTING,
          quote,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setActiveSwap?.(swapTx);

        // Create withdrawal swap
        const swap = await atomiqService.createWithdrawalSwap(
          amount,
          lightningAddress,
          account
        );

        updateActiveSwap?.({ swap, status: SwapStatus.AWAITING_PAYMENT });

        // Monitor withdrawal
        await atomiqService.waitForWithdrawal(swap, {
          onClaimed: () => {
            updateActiveSwap?.({ status: SwapStatus.COMPLETED });
          },
          onError: (error) => {
            updateActiveSwap?.({
              status: SwapStatus.FAILED,
              error: error.message,
            });
          },
        });

        return true;
      } catch (error) {
        console.error("Withdrawal failed:", error);
        updateActiveSwap?.({
          status: SwapStatus.FAILED,
          error: (error as Error).message,
        });
        throw error;
      }
    },
    [account, atomiqService, getQuote, setActiveSwap, updateActiveSwap]
  );

  return {
    activeSwap,
    getQuote,
    startDeposit,
    startWithdrawal,
    clearActiveSwap,
  };
}
```

---

### Step 7: UI Components

**Component Structure:**

1. `XverseConnectButton.tsx` - Connect wallet button
2. `DepositModal.tsx` - Full deposit flow modal
3. `WithdrawModal.tsx` - Full withdrawal flow modal
4. `SwapQuoteCard.tsx` - Display quote info
5. `LightningInvoiceDisplay.tsx` - Show invoice + QR code
6. `SwapStatusTracker.tsx` - Progress indicator
7. `BTCBalanceDisplay.tsx` - Show BTC balance

**(Components are extensive - I'll create these in the actual implementation phase)**

---

## Testing Strategy

### Unit Tests

- Service layer functions
- Utility functions
- State management logic

### Integration Tests

1. **Xverse Connection**

   - Connect wallet
   - Get addresses
   - Sign messages

2. **Atomiq Quote**

   - Get deposit quote
   - Get withdrawal quote
   - Handle errors

3. **Lightning Deposit**

   - Create swap
   - Generate invoice
   - Mock payment
   - Claim funds

4. **Lightning Withdrawal**
   - Create swap
   - Commit STRK
   - Monitor payout

### End-to-End Tests

1. Full deposit flow on testnet
2. Full withdrawal flow on testnet
3. Error scenarios (timeout, cancel, refund)

---

## Error Handling

### Error Categories

1. **Connection Errors**

   - Xverse not installed
   - User cancels connection
   - Network mismatch

2. **Quote Errors**

   - Amount too small/large
   - No liquidity available
   - Network issues

3. **Payment Errors**

   - Timeout (invoice expired)
   - Insufficient funds
   - Network confirmation delays

4. **Claim Errors**
   - Starknet tx failure
   - Gas estimation issues
   - Contract errors

### Error Recovery

```typescript
// Example error handling pattern
try {
  await operation();
} catch (error) {
  if (error.message.includes("timeout")) {
    // Allow user to retry or refund
    showRefundOption();
  } else if (error.message.includes("insufficient")) {
    // Show balance error
    showInsufficientFundsError();
  } else {
    // Generic error with details
    showGenericError(error);
  }
}
```

---

## UX Considerations

### Loading States

- "Connecting to Xverse..."
- "Getting quote from Atomiq..."
- "Generating Lightning invoice..."
- "Waiting for payment..." (with countdown timer)
- "Claiming funds on Starknet..."

### Success States

- ✅ "Wallet connected!"
- ✅ "Payment received!"
- ✅ "Deposit complete! STRK is now available."
- ✅ "Withdrawal complete! BTC sent to your Lightning address."

### Error States

- ❌ "Connection failed. Please try again."
- ❌ "Quote expired. Please refresh."
- ❌ "Payment timeout. Invoice expired."
- ⚠️ "Swap failed. Initiating refund..."

### User Guidance

- Show estimated time for each step
- Display QR codes prominently
- Provide copy-to-clipboard for invoices
- Show transaction history
- Link to block explorers

---

## Integration with Existing Game

### Connect to Escrow System

```typescript
// After successful deposit
async function onDepositComplete(amountSTRK: bigint) {
  // Update game balance
  updateBalance(amountSTRK);

  // Optional: Auto-stake in game
  if (userWantsToStake) {
    await stakeInGame(amountSTRK);
  }
}

// Before withdrawal
async function onWithdrawalRequest(amountSTRK: bigint) {
  // Check if user has sufficient balance
  const balance = await getSTRKBalance();
  if (balance < amountSTRK) {
    throw new Error("Insufficient balance");
  }

  // Check if funds are locked in active game
  const lockedAmount = await getLockedFunds();
  if (balance - lockedAmount < amountSTRK) {
    throw new Error("Funds locked in active game");
  }

  // Proceed with withdrawal
  await startWithdrawal(amountSTRK);
}
```

---

## Next Steps

### Immediate Actions

1. ✅ Review and approve this plan
2. 🔄 Install dependencies
3. 🔄 Create service layer
4. 🔄 Implement Xverse integration
5. 🔄 Implement Atomiq integration
6. 🔄 Build UI components
7. 🔄 Test on testnet
8. 🔄 Polish and document

### Timeline

- **Day 1:** Steps 1-4 (Infrastructure + Services)
- **Day 2:** Steps 5-6 (Hooks + UI)
- **Day 3:** Step 7-8 (Testing + Polish)

---

## Success Criteria

- [ ] Xverse wallet connects successfully
- [ ] BTC address displayed and bound to Starknet address
- [ ] Lightning deposit quote retrieved
- [ ] Lightning invoice generated and displayed with QR
- [ ] Payment detection works (testnet)
- [ ] Funds claimed on Starknet automatically
- [ ] STRK balance updates in game
- [ ] Lightning withdrawal initiates successfully
- [ ] BTC payout received on Lightning
- [ ] Error handling works for all edge cases
- [ ] UX is smooth and intuitive
- [ ] Transaction history tracked
- [ ] Full end-to-end flow tested

---

**Ready to implement! Let's start with Phase 1.**
