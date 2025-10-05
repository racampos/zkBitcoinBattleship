// Swap utility functions

import type { SwapStatus, SwapDirection } from "../services/types/swap.types";

/**
 * Get human-readable swap status
 */
export function getSwapStatusText(status: SwapStatus): string {
  const statusMap: Record<SwapStatus, string> = {
    idle: "Idle",
    quoting: "Getting Quote",
    quote_ready: "Quote Ready",
    committing: "Creating Swap",
    awaiting_payment: "Awaiting Payment",
    payment_received: "Payment Received",
    claiming: "Claiming Funds",
    completed: "Completed",
    failed: "Failed",
    expired: "Expired",
    refundable: "Refundable",
  };

  return statusMap[status] || "Unknown";
}

/**
 * Get swap status color
 */
export function getSwapStatusColor(
  status: SwapStatus
): "blue" | "green" | "red" | "yellow" | "gray" {
  const colorMap: Record<SwapStatus, "blue" | "green" | "red" | "yellow" | "gray"> = {
    idle: "gray",
    quoting: "blue",
    quote_ready: "blue",
    committing: "blue",
    awaiting_payment: "yellow",
    payment_received: "green",
    claiming: "blue",
    completed: "green",
    failed: "red",
    expired: "red",
    refundable: "yellow",
  };

  return colorMap[status] || "gray";
}

/**
 * Check if swap is in progress
 */
export function isSwapInProgress(status: SwapStatus): boolean {
  return [
    "quoting",
    "committing",
    "awaiting_payment",
    "payment_received",
    "claiming",
  ].includes(status);
}

/**
 * Check if swap is terminal (completed or failed)
 */
export function isSwapTerminal(status: SwapStatus): boolean {
  return ["completed", "failed", "expired"].includes(status);
}

/**
 * Get swap direction label
 */
export function getSwapDirectionLabel(direction: SwapDirection): string {
  return direction === "btc_to_strk"
    ? "Bitcoin → Starknet"
    : "Starknet → Bitcoin";
}

/**
 * Get swap direction icon
 */
export function getSwapDirectionIcon(direction: SwapDirection): string {
  return direction === "btc_to_strk" ? "⬇️" : "⬆️";
}

/**
 * Calculate estimated time for swap (in seconds)
 */
export function estimateSwapTime(direction: SwapDirection): number {
  // Lightning swaps are typically very fast
  // Deposit: ~5-10 seconds
  // Withdrawal: ~10-15 seconds (includes Starknet tx confirmation)
  return direction === "btc_to_strk" ? 10 : 15;
}

/**
 * Format swap time remaining
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return "Expired";

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate swap efficiency (output vs input percentage)
 */
export function calculateSwapEfficiency(
  inputAmount: bigint,
  outputAmount: bigint,
  inputDecimals: number,
  outputDecimals: number,
  exchangeRate: number
): number {
  const input = Number(inputAmount) / Math.pow(10, inputDecimals);
  const output = Number(outputAmount) / Math.pow(10, outputDecimals);
  const expectedOutput = input * exchangeRate;
  
  return (output / expectedOutput) * 100;
}

