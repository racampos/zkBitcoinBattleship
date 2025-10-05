// BTC Balance Display Component

import React from "react";

interface BTCBalanceDisplayProps {
  balance: bigint;
  label?: string;
  showUSD?: boolean;
  usdPrice?: number;
  className?: string;
}

export const BTCBalanceDisplay: React.FC<BTCBalanceDisplayProps> = ({
  balance,
  label = "Balance",
  showUSD = false,
  usdPrice = 60000, // Default BTC price in USD
  className = "",
}) => {
  const formatSats = (sats: bigint) => {
    return sats.toLocaleString();
  };

  const formatBTC = (sats: bigint) => {
    const btc = Number(sats) / 1e8;
    return btc.toFixed(8);
  };

  const formatUSD = (sats: bigint) => {
    const btc = Number(sats) / 1e8;
    const usd = btc * usdPrice;
    return usd.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
              {formatSats(balance)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              sats
            </span>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            ≈ {formatBTC(balance)} BTC
          </div>

          {showUSD && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ≈ {formatUSD(balance)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

