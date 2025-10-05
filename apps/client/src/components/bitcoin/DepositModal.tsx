// Deposit Modal Component - Full Bitcoin → Starknet flow

import React, { useState, useEffect } from "react";
import { useAtomiqSwap } from "../../hooks/useAtomiqSwap";
import { useBitcoinWallet } from "../../hooks/useBitcoinWallet";
import { SwapQuoteCard } from "./SwapQuoteCard";
import { LightningInvoiceDisplay } from "./LightningInvoiceDisplay";
import { SwapStatusTracker } from "./SwapStatusTracker";
import { SwapDirection, SwapStatus } from "../../services/types/swap.types";
import type { SwapQuote } from "../../services/types/swap.types";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amountSTRK: bigint) => void;
}

type DepositStep = "amount" | "quote" | "payment" | "complete";

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { connected: btcConnected, address: btcAddress } = useBitcoinWallet();
  const { activeSwap, getQuote, startDeposit, clearActiveSwap } = useAtomiqSwap();

  const [step, setStep] = useState<DepositStep>("amount");
  const [amount, setAmount] = useState<string>("10000"); // Default 10k sats
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Starknet address from global context
  // @ts-ignore
  const starknetAddress = window.account?.address;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("amount");
      setQuote(null);
      setError(null);
      clearActiveSwap?.();
    }
  }, [isOpen, clearActiveSwap]);

  // Monitor swap status
  useEffect(() => {
    if (activeSwap) {
      if (activeSwap.status === SwapStatus.AWAITING_PAYMENT) {
        setStep("payment");
      } else if (activeSwap.status === SwapStatus.COMPLETED) {
        setStep("complete");
        onSuccess?.(activeSwap.quote.outputAmount);
      }
    }
  }, [activeSwap, onSuccess]);

  const handleGetQuote = async () => {
    setIsLoadingQuote(true);
    setError(null);

    try {
      const sats = BigInt(amount);
      if (sats < 1000n) {
        throw new Error("Minimum amount is 1,000 sats");
      }

      const newQuote = await getQuote(SwapDirection.BTC_TO_STRK, sats);
      setQuote(newQuote);
      setStep("quote");
    } catch (err) {
      console.error("Failed to get quote:", err);
      setError(err instanceof Error ? err.message : "Failed to get quote");
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!quote || !starknetAddress) return;

    setError(null);

    try {
      await startDeposit(quote.inputAmount, starknetAddress);
      // Step will be updated by useEffect watching activeSwap
    } catch (err) {
      console.error("Failed to start deposit:", err);
      setError(err instanceof Error ? err.message : "Failed to start deposit");
    }
  };

  const handleClose = () => {
    if (activeSwap?.status === SwapStatus.AWAITING_PAYMENT) {
      if (
        !window.confirm(
          "You have a pending payment. Closing this will not cancel the swap. Continue?"
        )
      ) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Deposit Bitcoin
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Enter Amount */}
          {step === "amount" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (sats)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1000"
                  step="1000"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10000"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Minimum: 1,000 sats (~0.0001 BTC)
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <button
                onClick={handleGetQuote}
                disabled={isLoadingQuote || !amount}
                className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingQuote ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Getting Quote...</span>
                  </>
                ) : (
                  <span>Get Quote</span>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Review Quote */}
          {step === "quote" && quote && (
            <div>
              <SwapQuoteCard
                quote={quote}
                onConfirm={handleConfirmSwap}
                onCancel={() => {
                  setStep("amount");
                  setQuote(null);
                }}
                isLoading={activeSwap?.status === SwapStatus.COMMITTING}
              />
            </div>
          )}

          {/* Step 3: Show Payment */}
          {step === "payment" && activeSwap && (
            <div className="space-y-6">
              <SwapStatusTracker
                status={activeSwap.status}
                error={activeSwap.error}
              />

              {activeSwap.lightningInvoice && (
                <LightningInvoiceDisplay
                  invoice={activeSwap.lightningInvoice}
                  amount={activeSwap.quote.inputAmount}
                  expiresAt={activeSwap.quote.expiresAt}
                />
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && activeSwap && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Deposit Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your STRK is now available on Starknet
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-mono text-green-600 dark:text-green-400">
                  +{" "}
                  {(
                    Number(activeSwap.quote.outputAmount) / 1e18
                  ).toFixed(6)}{" "}
                  STRK
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Connection Warning */}
          {!btcConnected && step === "amount" && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                💡 Connect your Bitcoin wallet to make payments
              </p>
            </div>
          )}

          {!starknetAddress && step === "amount" && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                💡 Connect your Starknet wallet first
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

