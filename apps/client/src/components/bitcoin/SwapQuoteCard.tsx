// Swap Quote Card Component

import React from "react";
import type { SwapQuote, SwapDirection } from "../../services/types/swap.types";

interface SwapQuoteCardProps {
  quote: SwapQuote;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const SwapQuoteCard: React.FC<SwapQuoteCardProps> = ({
  quote,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const formatAmount = (amount: bigint, token: string) => {
    if (token === "BTC" || token === "BTCLN") {
      // Display in sats
      return `${amount.toLocaleString()} sats`;
    } else {
      // Display in STRK with decimals
      const strk = Number(amount) / 1e18;
      return `${strk.toFixed(6)} STRK`;
    }
  };

  const formatFee = (fee: bigint, token: string) => {
    if (token === "BTC" || token === "BTCLN") {
      return `${fee.toLocaleString()} sats`;
    } else {
      const strk = Number(fee) / 1e18;
      return `${strk.toFixed(6)} STRK`;
    }
  };

  const formatRate = () => {
    const isDeposit = quote.direction === "btc_to_strk";
    if (isDeposit) {
      return `1 sat = ${quote.rate.toFixed(8)} STRK`;
    } else {
      return `1 STRK = ${(1 / quote.rate).toFixed(0)} sats`;
    }
  };

  const getDirectionLabel = () => {
    return quote.direction === "btc_to_strk"
      ? "Bitcoin → Starknet"
      : "Starknet → Bitcoin";
  };

  const getDirectionIcon = () => {
    return quote.direction === "btc_to_strk" ? "➡️" : "⬅️";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Swap Quote
        </h3>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
          {getDirectionIcon()} {getDirectionLabel()}
        </span>
      </div>

      {/* Amounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            You Send
          </span>
          <span className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
            {formatAmount(quote.inputAmount, quote.inputToken)}
          </span>
        </div>

        <div className="flex justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            You Receive
          </span>
          <span className="text-lg font-mono font-semibold text-green-600 dark:text-green-400">
            {formatAmount(quote.outputAmount, quote.outputToken)}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {formatRate()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {formatFee(quote.fee, quote.inputToken)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Expires In</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {Math.floor((quote.expiresAt - Date.now()) / 60000)} minutes
          </span>
        </div>
      </div>

      {/* Actions */}
      {(onConfirm || onCancel) && (
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}

          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
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
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Swap</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          ⚡ Lightning swaps settle instantly. Zero slippage guaranteed.
        </p>
      </div>
    </div>
  );
};

