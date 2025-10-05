// Atomiq swap hook for BTC ↔ STRK swaps

import { useCallback } from "react";
import { AtomiqService } from "../services/atomiq";
import { useSwapStore } from "../store/swapStore";
import type { SwapDirection } from "../services/types/swap.types";
import { SwapStatus } from "../services/types/swap.types";

/**
 * Hook to manage Atomiq swaps
 * Integrates with Cartridge Controller account from global context
 */
export function useAtomiqSwap() {
  const atomiqService = AtomiqService.getInstance();
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
      // Get account from global context (Cartridge Controller)
      // @ts-ignore - account is from global game.js context
      const account = window.account;

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
    [atomiqService, getQuote, setActiveSwap, updateActiveSwap]
  );

  const startWithdrawal = useCallback(
    async (amount: bigint, lightningAddress: string) => {
      // Get account from global context (Cartridge Controller)
      // @ts-ignore - account is from global game.js context
      const account = window.account;

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
    [atomiqService, getQuote, setActiveSwap, updateActiveSwap]
  );

  return {
    activeSwap,
    getQuote,
    startDeposit,
    startWithdrawal,
    clearActiveSwap,
  };
}

