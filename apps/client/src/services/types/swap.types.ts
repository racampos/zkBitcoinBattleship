// Atomiq swap types

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

